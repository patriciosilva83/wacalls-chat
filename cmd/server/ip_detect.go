package main

import (
	"context"
	"io"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"
)

// getPublicIP returns the configured public IP or queries api.ipify.org if set to "auto".
func getPublicIP(ctx context.Context) string {
	val := strings.TrimSpace(os.Getenv("WACALLS_PUBLIC_IP"))
	if val == "" {
		return "127.0.0.1"
	}
	if strings.ToLower(val) != "auto" {
		return val
	}

	slog.Info("detecting public IP automatically...")
	client := &http.Client{Timeout: 5 * time.Second}
	req, err := http.NewRequestWithContext(ctx, "GET", "https://api.ipify.org", nil)
	if err != nil {
		slog.Warn("failed to create public IP detection request, falling back to 127.0.0.1", "err", err)
		return "127.0.0.1"
	}
	resp, err := client.Do(req)
	if err != nil {
		slog.Warn("failed to detect public IP, falling back to 127.0.0.1", "err", err)
		return "127.0.0.1"
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		slog.Warn("failed to read public IP response, falling back to 127.0.0.1", "err", err)
		return "127.0.0.1"
	}
	ip := strings.TrimSpace(string(body))
	slog.Info("public IP detected", "ip", ip)
	return ip
}
