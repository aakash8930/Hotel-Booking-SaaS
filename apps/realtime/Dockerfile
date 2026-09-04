# Build stage
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Cache dependencies
COPY go.mod go.sum ./
RUN go mod download

# Build binary
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /bin/realtime .

# Runtime stage
FROM alpine:3.19

RUN apk --no-cache add ca-certificates

COPY --from=builder /bin/realtime /bin/realtime

EXPOSE 4001

CMD ["/bin/realtime"]
