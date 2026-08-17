// Package config carrega variáveis de ambiente para o serviço WhatsApp.
package config

import (
	"fmt"
	"net"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Environment          string
	Port                 int
	LogLevel             string
	InternalServiceToken string

	// Evolution API (WhatsApp provider)
	EvolutionAPIURL   string
	EvolutionAPIKey   string
	EvolutionInstance string

	// Legacy / Meta (mantido p/ compatibilidade — não usado quando Evolution está ativo)
	WhatsAppProvider      string
	WhatsAppAPIURL        string
	WhatsAppPhoneNumberID string
	WhatsAppAccessToken   string
	WhatsAppVerifyToken   string

	GatewayURL string

	// HMAC para assinar webhooks enviados ao Fastify gateway. Em produção
	// deve ser igual a EVOLUTION_WEBHOOK_SECRET do gateway.
	WebhookSecret string
	// CIDRs de origem do provider/ingress que pode chamar o webhook público.
	// Obrigatório em staging/produção enquanto a Evolution não disponibilizar
	// uma assinatura verificável de payload.
	WebhookAllowedCIDRs []*net.IPNet
}

func Load() (*Config, error) {
	_ = godotenv.Load() // ignora erro se .env não existir (produção usa env real)

	port, err := strconv.Atoi(getEnv("PORT", "8010"))
	if err != nil {
		return nil, fmt.Errorf("invalid PORT: %w", err)
	}

	allowedCIDRs, err := parseCIDRs(os.Getenv("EVOLUTION_WEBHOOK_ALLOWED_CIDRS"))
	if err != nil {
		return nil, err
	}

	cfg := &Config{
		Environment:          getEnv("ENVIRONMENT", "development"),
		Port:                 port,
		LogLevel:             getEnv("LOG_LEVEL", "info"),
		InternalServiceToken: requireEnv("INTERNAL_SERVICE_TOKEN"),

		EvolutionAPIURL:   os.Getenv("EVOLUTION_API_URL"),
		EvolutionAPIKey:   os.Getenv("EVOLUTION_API_KEY"),
		EvolutionInstance: getEnv("EVOLUTION_INSTANCE", "evolua"),

		WhatsAppProvider:      getEnv("WHATSAPP_PROVIDER", "evolution"),
		WhatsAppAPIURL:        getEnv("WHATSAPP_API_URL", "https://graph.facebook.com/v21.0"),
		WhatsAppPhoneNumberID: os.Getenv("WHATSAPP_PHONE_NUMBER_ID"),
		WhatsAppAccessToken:   os.Getenv("WHATSAPP_ACCESS_TOKEN"),
		WhatsAppVerifyToken:   os.Getenv("WHATSAPP_VERIFY_TOKEN"),

		GatewayURL: getEnv("GATEWAY_URL", "http://localhost:3000"),

		WebhookSecret:       os.Getenv("EVOLUTION_WEBHOOK_SECRET"),
		WebhookAllowedCIDRs: allowedCIDRs,
	}
	if (cfg.Environment == "production" || cfg.Environment == "staging") && cfg.WebhookSecret == "" {
		return nil, fmt.Errorf("missing EVOLUTION_WEBHOOK_SECRET in %s", cfg.Environment)
	}
	if (cfg.Environment == "production" || cfg.Environment == "staging") && os.Getenv("GATEWAY_URL") == "" {
		return nil, fmt.Errorf("missing GATEWAY_URL in %s", cfg.Environment)
	}
	if (cfg.Environment == "production" || cfg.Environment == "staging") && len(cfg.WebhookAllowedCIDRs) == 0 {
		return nil, fmt.Errorf("missing EVOLUTION_WEBHOOK_ALLOWED_CIDRS in %s", cfg.Environment)
	}
	return cfg, nil
}

func parseCIDRs(raw string) ([]*net.IPNet, error) {
	var networks []*net.IPNet
	for _, value := range strings.Split(raw, ",") {
		value = strings.TrimSpace(value)
		if value == "" {
			continue
		}
		_, network, err := net.ParseCIDR(value)
		if err != nil {
			return nil, fmt.Errorf("invalid EVOLUTION_WEBHOOK_ALLOWED_CIDRS entry %q: %w", value, err)
		}
		networks = append(networks, network)
	}
	return networks, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func requireEnv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		panic(fmt.Sprintf("missing required env var: %s", key))
	}
	return v
}
