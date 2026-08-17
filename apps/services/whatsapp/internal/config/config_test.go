package config

import (
	"os"
	"testing"
)

func TestLoadRequiresGatewayURLInProductionLikeEnvironments(t *testing.T) {
	t.Setenv("ENVIRONMENT", "staging")
	t.Setenv("INTERNAL_SERVICE_TOKEN", "test-internal-token")
	t.Setenv("EVOLUTION_WEBHOOK_SECRET", "test-webhook-secret")

	previous, hadPrevious := os.LookupEnv("GATEWAY_URL")
	if err := os.Unsetenv("GATEWAY_URL"); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() {
		if hadPrevious {
			_ = os.Setenv("GATEWAY_URL", previous)
		}
	})

	_, err := Load()
	if err == nil {
		t.Fatal("expected staging configuration without GATEWAY_URL to fail")
	}
}

func TestLoadRequiresWebhookSourceCIDRsInProductionLikeEnvironments(t *testing.T) {
	t.Setenv("ENVIRONMENT", "production")
	t.Setenv("INTERNAL_SERVICE_TOKEN", "test-internal-token")
	t.Setenv("EVOLUTION_WEBHOOK_SECRET", "test-webhook-secret")
	t.Setenv("GATEWAY_URL", "https://api.example.com")
	t.Setenv("EVOLUTION_WEBHOOK_ALLOWED_CIDRS", "")

	_, err := Load()
	if err == nil {
		t.Fatal("expected production configuration without webhook CIDRs to fail")
	}
}

func TestLoadRejectsInvalidWebhookSourceCIDR(t *testing.T) {
	t.Setenv("ENVIRONMENT", "development")
	t.Setenv("INTERNAL_SERVICE_TOKEN", "test-internal-token")
	t.Setenv("EVOLUTION_WEBHOOK_ALLOWED_CIDRS", "not-a-cidr")

	_, err := Load()
	if err == nil {
		t.Fatal("expected invalid webhook CIDR configuration to fail")
	}
}
