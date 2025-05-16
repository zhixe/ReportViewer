package main

import (
	"context"
	"encoding/json"
	"io"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/gorilla/mux"
	"github.com/rs/cors"

	"report-viewer-backend/internal/config"
	"report-viewer-backend/internal/db"
	"report-viewer-backend/internal/handler"
	"report-viewer-backend/internal/query"
)

func main() {
	// Load configuration
	cfg := config.Load()

	// Initialize DB connection pool
	database, err := db.NewDatabase(cfg)
	if err != nil {
		log.Fatal("DB connect error:", err)
	}
	defer database.Close()

	// Automated DB health check at startup
	if err := database.Conn.Ping(); err != nil {
		log.Fatalf("Startup DB health check failed: %v", err)
	}
	log.Print("DB health check: OK")

	// Set up service and handler
	queryService := query.NewQueryService(database.Conn)
	dbHandler := handler.NewDBHandler(queryService)

	// Set up HTTP router and routes
	r := mux.NewRouter()
	r.Use(RequestLogger) // Logging middleware

	r.HandleFunc("/api/query/tables", dbHandler.ListTables).Methods("GET")
	r.HandleFunc("/api/query", dbHandler.QueryTable).Methods("GET")
	r.HandleFunc("/api/db/test-connection", dbHandler.TestConnection).Methods("GET")

	// Enable CORS (for frontend dev on a different port)
	handlerWithCORS := cors.AllowAll().Handler(r)

	// Set up server for graceful shutdown
	srv := &http.Server{
		Addr:    ":7080",
		Handler: handlerWithCORS,
	}

	// Start server in goroutine
	go func() {
		log.Println("API server running at :7080")
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("listen: %s\n", err)
		}
	}()

	// Perform endpoint health check after server starts
	go func() {
		time.Sleep(2 * time.Second)
		performEndpointHealthChecks("http://localhost:7080")
	}()

	// Graceful shutdown on SIGINT/SIGTERM
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}
	log.Println("Server exiting")
}

// RequestLogger is a simple logging middleware
func RequestLogger(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("[%s] %s from %s", r.Method, r.RequestURI, r.RemoteAddr)
		next.ServeHTTP(w, r)
	})
}

// performEndpointHealthChecks will check key endpoints and log results
func performEndpointHealthChecks(baseURL string) bool {
	type endpoint struct {
		Name string
		URL  string
	}

	endpoints := []endpoint{
		{"DB Connection", baseURL + "/api/db/test-connection"},
		{"Table List", baseURL + "/api/query/tables"},
		// Add more if needed
	}

	allHealthy := true

	log.Print("Performing endpoint health checks:")
	for _, ep := range endpoints {
		resp, err := http.Get(ep.URL)
		if err != nil {
			log.Printf("  [%s] %s ... UNREACHABLE (%v)", ep.Name, ep.URL, err)
			allHealthy = false
			continue
		}
		body, _ := io.ReadAll(resp.Body)
		resp.Body.Close()
		status := "OK"
		if resp.StatusCode != http.StatusOK {
			status = "BAD HTTP " + resp.Status
			allHealthy = false
		} else if !isJSONStatusSuccess(body) {
			status = "BAD (Status not success)"
			allHealthy = false
		}
		log.Printf("  [%s] %s ... %s", ep.Name, ep.URL, status)
	}

	if allHealthy {
		log.Print("Endpoint health summary: ALL SYSTEMS OPERATIONAL ✅")
	} else {
		log.Print("Endpoint health summary: ISSUES DETECTED ❌")
	}
	return allHealthy
}

// isJSONStatusSuccess checks if JSON contains "status":"success"
func isJSONStatusSuccess(body []byte) bool {
	type statusResp struct {
		Status string `json:"status"`
	}
	var resp statusResp
	// Allow for both {"status":"success"} and JSON with more fields
	err := json.Unmarshal(body, &resp)
	return err == nil && resp.Status == "success"
}
