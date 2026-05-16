FROM golang:1.23-alpine AS build
WORKDIR /src
COPY go.mod go.sum* ./
RUN go mod download || true
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/whatsapp ./cmd/server

FROM alpine:3.20
RUN apk add --no-cache ca-certificates
COPY --from=build /out/whatsapp /usr/local/bin/whatsapp
EXPOSE 8010
USER nobody
ENTRYPOINT ["/usr/local/bin/whatsapp"]
