// Package middleware fornece autenticação interna entre serviços.
package middleware

import (
	"crypto/subtle"
	"net/http"
)

// InternalAuth valida o header x-internal-token contra o token configurado.
// Microservice confia no Fastify gateway: ele já validou JWT do usuário
// e propaga x-user-id no header.
func InternalAuth(token string) func(http.Handler) http.Handler {
	expected := []byte(token)
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			provided := []byte(r.Header.Get("X-Internal-Token"))
			if subtle.ConstantTimeCompare(provided, expected) != 1 {
				http.Error(w, `{"error":"Unauthorized","message":"Invalid internal token"}`, http.StatusUnauthorized)
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
