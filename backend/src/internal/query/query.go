package query

import (
	"database/sql"
	"fmt"
)

type QueryService struct {
	DB *sql.DB
}

func NewQueryService(db *sql.DB) *QueryService {
	return &QueryService{DB: db}
}

func (q *QueryService) ListTables() ([]string, error) {
	tables := []string{}
	rows, err := q.DB.Query("SHOW TABLES")
	if err != nil {
		return tables, err
	}
	defer rows.Close()
	for rows.Next() {
		var table string
		if err := rows.Scan(&table); err != nil {
			return tables, err
		}
		tables = append(tables, table)
	}
	return tables, nil
}

func (q *QueryService) QueryTable(table string) ([]string, []map[string]interface{}, error) {
	// NOTE: Validate table before using in production!
	query := fmt.Sprintf("SELECT * FROM `%s` LIMIT 100", table)
	rows, err := q.DB.Query(query)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()

	columns, _ := rows.Columns()
	results := []map[string]interface{}{}
	for rows.Next() {
		columnsVals := make([]interface{}, len(columns))
		columnsPtrs := make([]interface{}, len(columns))
		for i := range columnsVals {
			columnsPtrs[i] = &columnsVals[i]
		}
		rows.Scan(columnsPtrs...)
		row := map[string]interface{}{}
		for i, colName := range columns {
			val := columnsVals[i]
			b, ok := val.([]byte)
			if ok {
				row[colName] = string(b)
			} else {
				row[colName] = val
			}
		}
		results = append(results, row)
	}
	return columns, results, nil
}
