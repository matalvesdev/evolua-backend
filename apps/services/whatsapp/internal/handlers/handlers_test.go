package handlers

import (
	"net"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/rs/zerolog"
)

func TestWebhookRejectsSourceOutsideConfiguredCIDRs(t *testing.T) {
	_, allowedNetwork, err := net.ParseCIDR("198.51.100.0/24")
	if err != nil {
		t.Fatal(err)
	}
	h := NewHandler(zerolog.Nop(), Options{WebhookAllowedCIDRs: []*net.IPNet{allowedNetwork}})
	req := httptest.NewRequest(http.MethodPost, "/webhook", strings.NewReader(`{"event":"messages.upsert"}`))
	req.RemoteAddr = "203.0.113.25:4000"
	res := httptest.NewRecorder()

	h.Webhook(res, req)

	if res.Code != http.StatusForbidden {
		t.Fatalf("expected status %d, got %d", http.StatusForbidden, res.Code)
	}
}

func TestWebhookAcceptsConfiguredSourceBeforePayloadValidation(t *testing.T) {
	_, allowedNetwork, err := net.ParseCIDR("198.51.100.0/24")
	if err != nil {
		t.Fatal(err)
	}
	h := NewHandler(zerolog.Nop(), Options{WebhookAllowedCIDRs: []*net.IPNet{allowedNetwork}})
	req := httptest.NewRequest(http.MethodPost, "/webhook", strings.NewReader(`not-json`))
	req.RemoteAddr = "198.51.100.25:4000"
	res := httptest.NewRecorder()

	h.Webhook(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("expected status %d, got %d", http.StatusOK, res.Code)
	}
}
