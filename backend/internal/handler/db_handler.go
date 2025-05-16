package handler

import (
	"encoding/json"
	"net/http"
	"report-viewer-backend/internal/query"
)

type DBHandler struct {
	Query *query.QueryService
}

func NewDBHandler(q *query.QueryService) *DBHandler {
	return &DBHandler{Query: q}
}

func (h *DBHandler) ListTables(w http.ResponseWriter, r *http.Request) {
	tables, err := h.Query.ListTables()
	if err != nil {
		http.Error(w, "Failed to fetch tables: "+err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "success",
		"tables": tables,
	})
}

func (h *DBHandler) QueryTable(w http.ResponseWriter, r *http.Request) {
	table := r.URL.Query().Get("table")
	if table == "" {
		http.Error(w, "Missing table parameter", http.StatusBadRequest)
		return
	}
	_, results, err := h.Query.QueryTable(table)
	if err != nil {
		http.Error(w, "Failed to query table: "+err.Error(), http.StatusInternalServerError)
		return
	}
	json.NewEncoder(w).Encode(map[string]interface{}{
		"status": "success",
		"data":   results,
	})
}

func (h *DBHandler) TestConnection(w http.ResponseWriter, r *http.Request) {
	err := h.Query.DB.Ping()
	if err != nil {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status":  "error",
			"message": err.Error(),
		})
	} else {
		json.NewEncoder(w).Encode(map[string]interface{}{
			"status": "success",
		})
	}
}
