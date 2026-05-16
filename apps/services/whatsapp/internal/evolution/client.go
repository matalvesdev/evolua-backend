// Package evolution implementa o cliente HTTP para Evolution API.
// Documentação: https://doc.evolution-api.com
package evolution

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"regexp"
	"strings"
	"time"
)

// Client encapsula chamadas à Evolution API.
type Client struct {
	baseURL    string
	apiKey     string
	instance   string
	httpClient *http.Client
}

// New cria um Client. Retorna nil se baseURL ou apiKey estiverem vazios.
func New(baseURL, apiKey, instance string) *Client {
	if baseURL == "" || apiKey == "" {
		return nil
	}
	return &Client{
		baseURL:    strings.TrimRight(baseURL, "/"),
		apiKey:     apiKey,
		instance:   instance,
		httpClient: &http.Client{Timeout: 15 * time.Second},
	}
}

// IsEnabled retorna true se o client está configurado.
func (c *Client) IsEnabled() bool {
	return c != nil
}

var nonDigit = regexp.MustCompile(`\D`)

// NormalizePhone aceita "(11) 99999-8888", "11999998888" ou "5511999998888"
// e retorna sempre o formato internacional sem '+', ex: "5511999998888".
func NormalizePhone(phone string) string {
	digits := nonDigit.ReplaceAllString(phone, "")
	if strings.HasPrefix(digits, "55") && len(digits) >= 12 {
		return digits
	}
	return "55" + digits
}

// SendTextResult representa o resultado do envio.
type SendTextResult struct {
	MessageID string
	Status    string // "sent" | "queued" | "failed"
}

// SendText envia mensagem de texto via Evolution API.
func (c *Client) SendText(ctx context.Context, to, text string) (*SendTextResult, error) {
	if !c.IsEnabled() {
		return nil, errors.New("evolution api not configured")
	}

	number := NormalizePhone(to)
	body, _ := json.Marshal(map[string]string{
		"number": number,
		"text":   text,
	})

	url := fmt.Sprintf("%s/message/sendText/%s", c.baseURL, c.instance)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(body))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("apikey", c.apiKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respBody, _ := io.ReadAll(resp.Body)

	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("evolution api %d: %s", resp.StatusCode, truncate(string(respBody), 500))
	}

	// A resposta varia por versão; tentamos vários campos
	var parsed struct {
		Key struct {
			ID string `json:"id"`
		} `json:"key"`
		MessageID string `json:"messageId"`
		ID        string `json:"id"`
		Status    string `json:"status"`
	}
	if err := json.Unmarshal(respBody, &parsed); err != nil {
		// Resposta não-JSON ainda assim 2xx — considerar enviado
		return &SendTextResult{Status: "sent"}, nil
	}

	id := parsed.Key.ID
	if id == "" {
		id = parsed.MessageID
	}
	if id == "" {
		id = parsed.ID
	}
	status := parsed.Status
	if status == "" {
		status = "sent"
	}
	return &SendTextResult{MessageID: id, Status: status}, nil
}

// CheckConnection consulta o estado da instância.
func (c *Client) CheckConnection(ctx context.Context) (string, error) {
	if !c.IsEnabled() {
		return "not_configured", nil
	}
	url := fmt.Sprintf("%s/instance/connectionState/%s", c.baseURL, c.instance)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return "error", err
	}
	req.Header.Set("apikey", c.apiKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "error", err
	}
	defer resp.Body.Close()
	respBody, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return "error", fmt.Errorf("status %d: %s", resp.StatusCode, truncate(string(respBody), 200))
	}
	var parsed struct {
		Instance struct {
			State string `json:"state"`
		} `json:"instance"`
		State string `json:"state"`
	}
	_ = json.Unmarshal(respBody, &parsed)
	if parsed.Instance.State != "" {
		return parsed.Instance.State, nil
	}
	if parsed.State != "" {
		return parsed.State, nil
	}
	return "unknown", nil
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "..."
}
