// Package main inicia o serviço WhatsApp.
package main

import (
	"context"
	"errors"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/go-chi/chi/v5"
	chimw "github.com/go-chi/chi/v5/middleware"
	"github.com/go-chi/cors"
	"github.com/rs/zerolog"

	"github.com/evolua/services/whatsapp/internal/config"
	"github.com/evolua/services/whatsapp/internal/evolution"
	"github.com/evolua/services/whatsapp/internal/handlers"
	"github.com/evolua/services/whatsapp/internal/middleware"
)

func main() {
	logger := zerolog.New(os.Stdout).With().Timestamp().Logger()

	cfg, err := config.Load()
	if err != nil {
		logger.Fatal().Err(err).Msg("failed to load config")
	}

	r := chi.NewRouter()
	r.Use(chimw.RequestID)
	r.Use(chimw.RealIP)
	r.Use(chimw.Recoverer)
	r.Use(chimw.Timeout(30 * time.Second))
	// CORS — em produção apenas o gateway Fastify chama este serviço.
	// AllowedOrigins é vazio em prod (sem CORS necessário; comunicação server-to-server)
	// e "*" apenas em dev para facilitar requests do navegador.
	corsOrigins := []string{cfg.GatewayURL}
	if cfg.Environment == "development" {
		corsOrigins = []string{"*"}
	}
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   corsOrigins,
		AllowedMethods:   []string{"GET", "POST", "OPTIONS"},
		AllowedHeaders:   []string{"Content-Type", "X-Internal-Token", "X-Evolution-Signature"},
		AllowCredentials: false,
		MaxAge:           300,
	}))

	h := handlers.NewHandler(logger, handlers.Options{
		Evolution: evolution.New(
			cfg.EvolutionAPIURL,
			cfg.EvolutionAPIKey,
			cfg.EvolutionInstance,
		),
		GatewayURL:           cfg.GatewayURL,
		InternalServiceToken: cfg.InternalServiceToken,
		WhatsAppVerifyToken:  cfg.WhatsAppVerifyToken,
		WebhookSecret:        cfg.WebhookSecret,
	})

	if cfg.WebhookSecret == "" {
		logger.Warn().Msg("EVOLUTION_WEBHOOK_SECRET not set; outbound webhook will not be HMAC-signed (gateway must accept dev-mode)")
	}

	if cfg.EvolutionAPIURL == "" || cfg.EvolutionAPIKey == "" {
		logger.Warn().Msg("EVOLUTION_API_URL / EVOLUTION_API_KEY not configured; sending will be disabled")
	} else {
		logger.Info().Str("url", cfg.EvolutionAPIURL).Str("instance", cfg.EvolutionInstance).
			Msg("evolution api configured")
	}

	// Rotas públicas
	r.Get("/healthz", h.Health)
	r.Get("/readyz", h.Ready)

	// Webhook público (validado por verify_token, não pelo internal token)
	r.HandleFunc("/webhook", h.Webhook)

	// Rotas internas (Fastify gateway → este serviço)
	r.Group(func(r chi.Router) {
		r.Use(middleware.InternalAuth(cfg.InternalServiceToken))
		r.Post("/messages/send", h.SendMessage)
	})

	addr := fmt.Sprintf(":%d", cfg.Port)
	srv := &http.Server{
		Addr:              addr,
		Handler:           r,
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		logger.Info().Str("addr", addr).Str("env", cfg.Environment).Msg("whatsapp service listening")
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			logger.Fatal().Err(err).Msg("server error")
		}
	}()

	// Graceful shutdown
	stop := make(chan os.Signal, 1)
	signal.Notify(stop, syscall.SIGINT, syscall.SIGTERM)
	<-stop

	logger.Info().Msg("shutting down...")
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		logger.Error().Err(err).Msg("forced shutdown")
		os.Exit(1)
	}
	logger.Info().Msg("stopped cleanly")
}
