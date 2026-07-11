# --- Stage 1: Build the React Frontend ---
FROM node:20-alpine AS frontend-builder
WORKDIR /app
COPY client/package*.json ./client/
RUN cd client && npm install
COPY client/ ./client/
RUN cd client && npm run build

# --- Stage 2: Build the Go Backend ---
FROM golang:1.26-alpine AS backend-builder
RUN apk add --no-cache git build-base
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
# Copy frontend build output so it can be embedded if necessary
COPY --from=frontend-builder /app/client/dist ./client/dist
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o wacalls ./cmd/server

# --- Stage 3: Final Production Image ---
FROM alpine:3.19
RUN apk add --no-cache ca-certificates tzdata
WORKDIR /app
COPY --from=backend-builder /app/wacalls .
COPY --from=frontend-builder /app/client/dist ./client/dist

# Expose default port
EXPOSE 8080

# Environment defaults
ENV DB_DRIVER=sqlite
ENV REDIS_URL=""

# Run command
ENTRYPOINT ["/app/wacalls", "-addr", ":8080", "-db", "/data/wacalls.db", "-static", "/app/client/dist"]
