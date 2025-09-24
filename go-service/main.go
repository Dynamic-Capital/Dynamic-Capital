package main

import (
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"
)

func commitSHA() string {
	keys := []string{
		"COMMIT_SHA",
		"GIT_COMMIT_SHA",
		"GIT_COMMIT",
		"SOURCE_VERSION",
		"VERCEL_GIT_COMMIT_SHA",
		"DIGITALOCEAN_GIT_COMMIT_SHA",
		"DIGITALOCEAN_DEPLOYMENT_ID",
		"DIGITALOCEAN_APP_DEPLOYMENT_SHA",
		"RENDER_GIT_COMMIT",
		"HEROKU_SLUG_COMMIT",
	}

	for _, key := range keys {
		if value, ok := os.LookupEnv(key); ok {
			trimmed := strings.TrimSpace(value)
			lower := strings.ToLower(trimmed)
			if trimmed != "" && lower != "undefined" && lower != "null" {
				return trimmed
			}
		}
	}

	return "unknown"
}

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	commit := commitSHA()

	mux := http.NewServeMux()
	mux.HandleFunc("/healthz", func(w http.ResponseWriter, r *http.Request) {
		logger.Info("healthz", "method", r.Method, "remote", r.RemoteAddr, "commit", commit)
		w.Header().Set("Content-Type", "text/plain; charset=utf-8")
		w.Write([]byte("ok " + commit))
	})

	srv := &http.Server{
		Addr:         ":8080",
		Handler:      http.TimeoutHandler(mux, 5*time.Second, "timeout"),
		ReadTimeout:  5 * time.Second,
		WriteTimeout: 10 * time.Second,
		IdleTimeout:  120 * time.Second,
	}

	logger.Info("listening", "addr", srv.Addr)
	if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
		logger.Error("server error", "err", err)
	}
}
