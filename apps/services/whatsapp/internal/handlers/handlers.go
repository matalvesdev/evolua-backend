// Package handlers contém os HTTP handlers do serviço WhatsApp.
package handlers

import (
	"bytes"
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/rs/zerolog"

	"github.com/evolua/services/whatsapp/internal/evolution"
)

type SendMessageRequest struct {
	To        string  `json:"to"`   // E.164 ou número BR — Evolution normaliza
	Body      string  `json:"body"`
	PatientID *string `json:"patientId,omitempty"`
}

type SendMessageResponse struct {
	MessageID string `json:"messageId"`
	Status    string `json:"status"`
}

type Handler struct {
	logger        zerolog.Logger
	evolution     *evolution.Client
	gatewayURL    string
	internalTok   string
	verifyToken   string
	webhookSecret string
}

type Options struct {
	Evolution            *evolution.Client
	GatewayURL           string
	InternalServiceToken string
	WhatsAppVerifyToken  string
	// WebhookSecret é o segredo HMAC-SHA256 compartilhado com o Fastify gateway
	// para assinar o body de cada forward. Se vazio, nenhum header é enviado
	// (o gateway exige em produção).
	WebhookSecret string
}

func NewHandler(logger zerolog.Logger, opts Options) *Handler {
	return &Handler{
		logger:        logger,
		evolution:     opts.Evolution,
		gatewayURL:    strings.TrimRight(opts.GatewayURL, "/"),
		internalTok:   opts.InternalServiceToken,
		verifyToken:   opts.WhatsAppVerifyToken,
		webhookSecret: opts.WebhookSecret,
	}
}

// Health: liveness probe (sem dependências externas).
func (h *Handler) Health(w http.ResponseWriter, _ *http.Request) {
	respondJSON(w, http.StatusOK, map[string]string{"status": "ok"})
}

// Ready: readiness probe — valida conexão com Evolution se configurada.
func (h *Handler) Ready(w http.ResponseWriter, r *http.Request) {
	if h.evolution.IsEnabled() {
		ctx, cancel := context.WithTimeout(r.Context(), 5*time.Second)
		defer cancel()
		state, err := h.evolution.CheckConnection(ctx)
		if err != nil {
			respondJSON(w, http.StatusServiceUnavailable, map[string]string{
				"status": "degraded",
				"state":  state,
				"error":  err.Error(),
			})
			return
		}
		respondJSON(w, http.StatusOK, map[string]string{
			"status": "ready",
			"state":  state,
		})
		return
	}
	respondJSON(w, http.StatusOK, map[string]string{
		"status": "ready",
		"state":  "not_configured",
	})
}

// SendMessage: envia mensagem WhatsApp via Evolution API.
func (h *Handler) SendMessage(w http.ResponseWriter, r *http.Request) {
	var req SendMessageRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		respondError(w, http.StatusBadRequest, "InvalidPayload", err.Error())
		return
	}
	defer r.Body.Close()

	if req.To == "" || req.Body == "" {
		respondError(w, http.StatusBadRequest, "ValidationError", "to and body are required")
		return
	}

	userID := r.Header.Get("X-User-Id")
	masked := maskPhone(req.To)

	if !h.evolution.IsEnabled() {
		h.logger.Warn().Str("userId", userID).Str("to", masked).
			Msg("evolution api not configured; message NOT sent")
		respondError(w, http.StatusServiceUnavailable, "NotConfigured",
			"WhatsApp provider not configured")
		return
	}

	ctx, cancel := context.WithTimeout(r.Context(), 20*time.Second)
	defer cancel()

	result, err := h.evolution.SendText(ctx, req.To, req.Body)
	if err != nil {
		h.logger.Error().Err(err).Str("userId", userID).Str("to", masked).
			Msg("send message failed")
		respondError(w, http.StatusBadGateway, "ProviderError", err.Error())
		return
	}

	h.logger.Info().Str("userId", userID).Str("to", masked).Str("messageId", result.MessageID).
		Msg("whatsapp message sent")

	respondJSON(w, http.StatusAccepted, SendMessageResponse{
		MessageID: result.MessageID,
		Status:    result.Status,
	})
}

// Webhook recebe eventos da Evolution API (mensagens inbound, status updates).
//
// Estratégia: traduz para um formato canônico e encaminha ao Fastify gateway
// em POST /api/wa-crm/webhook/inbound autenticado por x-internal-token.
func (h *Handler) Webhook(w http.ResponseWriter, r *http.Request) {
	// Verificação de webhook estilo Meta — Evolution não usa, mas mantemos compat
	if r.Method == http.MethodGet {
		mode := r.URL.Query().Get("hub.mode")
		challenge := r.URL.Query().Get("hub.challenge")
		token := r.URL.Query().Get("hub.verify_token")
		if mode == "subscribe" && (h.verifyToken == "" || token == h.verifyToken) {
			w.WriteHeader(http.StatusOK)
			_, _ = w.Write([]byte(challenge))
			return
		}
		http.Error(w, "Forbidden", http.StatusForbidden)
		return
	}

	if r.Method != http.MethodPost {
		http.Error(w, "Method Not Allowed", http.StatusMethodNotAllowed)
		return
	}

	body, err := io.ReadAll(r.Body)
	if err != nil {
		respondError(w, http.StatusBadRequest, "InvalidPayload", err.Error())
		return
	}
	defer r.Body.Close()

	var payload evolutionWebhookPayload
	if err := json.Unmarshal(body, &payload); err != nil {
		h.logger.Warn().Err(err).Msg("webhook payload malformed; ignoring")
		w.WriteHeader(http.StatusOK)
		return
	}

	canonical, ok := payload.toCanonical()
	if !ok {
		// Status updates / non-message events — ack mas não encaminha
		h.logger.Debug().Str("event", payload.Event).Msg("webhook ignored (non-message event)")
		w.WriteHeader(http.StatusOK)
		return
	}

	if err := h.forwardToGateway(r.Context(), canonical); err != nil {
		h.logger.Error().Err(err).Msg("failed to forward inbound message to gateway")
		// Ainda retornamos 200 para evitar reentregas em loop pelo Evolution
	}
	w.WriteHeader(http.StatusOK)
}

// ── Tipos do webhook Evolution API ──────────────────────────────────────────

type evolutionWebhookPayload struct {
	Event    string `json:"event"`
	Instance string `json:"instance"`
	Data     struct {
		Key struct {
			ID         string `json:"id"`
			RemoteJid  string `json:"remoteJid"`
			FromMe     bool   `json:"fromMe"`
			Participant string `json:"participant,omitempty"`
		} `json:"key"`
		PushName string `json:"pushName"`
		Message  struct {
			Conversation       string `json:"conversation"`
			ExtendedTextMessage struct {
				Text string `json:"text"`
			} `json:"extendedTextMessage"`
		} `json:"message"`
		MessageTimestamp int64 `json:"messageTimestamp"`
	} `json:"data"`
}

type canonicalInbound struct {
	MessageID   string `json:"messageId"`
	From        string `json:"from"`
	PushName    string `json:"pushName"`
	Text        string `json:"text"`
	Timestamp   int64  `json:"timestamp"`
}

func (p evolutionWebhookPayload) toCanonical() (canonicalInbound, bool) {
	// Apenas eventos de mensagem entrante interessam ao CRM
	if p.Event != "messages.upsert" || p.Data.Key.FromMe {
		return canonicalInbound{}, false
	}

	text := p.Data.Message.Conversation
	if text == "" {
		text = p.Data.Message.ExtendedTextMessage.Text
	}
	if text == "" {
		return canonicalInbound{}, false
	}

	// remoteJid no formato "5511999998888@s.whatsapp.net"
	from := p.Data.Key.RemoteJid
	if idx := strings.Index(from, "@"); idx > 0 {
		from = from[:idx]
	}

	return canonicalInbound{
		MessageID: p.Data.Key.ID,
		From:      from,
		PushName:  p.Data.PushName,
		Text:      text,
		Timestamp: p.Data.MessageTimestamp,
	}, true
}

func (h *Handler) forwardToGateway(ctx context.Context, msg canonicalInbound) error {
	if h.gatewayURL == "" {
		return nil
	}
	body, _ := json.Marshal(msg)
	url := h.gatewayURL + "/api/wa-crm/webhook/inbound"

	ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
	defer cancel()

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-Internal-Token", h.internalTok)
	if h.webhookSecret != "" {
		mac := hmac.New(sha256.New, []byte(h.webhookSecret))
		mac.Write(body)
		req.Header.Set("X-Evolution-Signature", "sha256="+hex.EncodeToString(mac.Sum(nil)))
	}

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return err
	}
	defer resp.Body.Close()
	_, _ = io.Copy(io.Discard, resp.Body)
	if resp.StatusCode >= 400 {
		return errFromStatus(resp.StatusCode)
	}
	return nil
}

func errFromStatus(code int) error {
	return &gatewayError{code: code}
}

type gatewayError struct{ code int }

func (e *gatewayError) Error() string {
	return "gateway responded with status " + http.StatusText(e.code)
}

// ── Helpers ─────────────────────────────────────────────────────────────────

func maskPhone(phone string) string {
	if len(phone) < 4 {
		return strings.Repeat("*", len(phone))
	}
	return strings.Repeat("*", len(phone)-4) + phone[len(phone)-4:]
}

func respondJSON(w http.ResponseWriter, status int, body interface{}) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(body)
}

func respondError(w http.ResponseWriter, status int, code, msg string) {
	respondJSON(w, status, map[string]string{"error": code, "message": msg})
}
