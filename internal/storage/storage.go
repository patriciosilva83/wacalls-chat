// Package storage abstracts the SQL backend used by the WaCalls server.
package storage

import (
	"context"
	"database/sql"
	"database/sql/driver"
	"fmt"
	"os"
	"strconv"
	"strings"

	"github.com/lib/pq"
	_ "modernc.org/sqlite" // pure-Go sqlite driver
)

type TranslatedDriver struct {
	parent driver.Driver
}

func (d *TranslatedDriver) Open(name string) (driver.Conn, error) {
	conn, err := d.parent.Open(name)
	if err != nil {
		return nil, err
	}
	return &TranslatedConn{conn: conn}, nil
}

type TranslatedConn struct {
	conn driver.Conn
}

func (c *TranslatedConn) Prepare(query string) (driver.Stmt, error) {
	return c.conn.Prepare(TranslateQuery("postgres", query))
}

func (c *TranslatedConn) Close() error {
	return c.conn.Close()
}

func (c *TranslatedConn) Begin() (driver.Tx, error) {
	return c.conn.Begin()
}

func (c *TranslatedConn) BeginTx(ctx context.Context, opts driver.TxOptions) (driver.Tx, error) {
	if bt, ok := c.conn.(driver.ConnBeginTx); ok {
		return bt.BeginTx(ctx, opts)
	}
	return c.conn.Begin()
}

func (c *TranslatedConn) PrepareContext(ctx context.Context, query string) (driver.Stmt, error) {
	if prep, ok := c.conn.(driver.ConnPrepareContext); ok {
		return prep.PrepareContext(ctx, TranslateQuery("postgres", query))
	}
	return c.conn.Prepare(TranslateQuery("postgres", query))
}

func (c *TranslatedConn) ExecContext(ctx context.Context, query string, args []driver.NamedValue) (driver.Result, error) {
	if execer, ok := c.conn.(driver.ExecerContext); ok {
		return execer.ExecContext(ctx, TranslateQuery("postgres", query), args)
	}
	if execer, ok := c.conn.(driver.Execer); ok {
		dargs, err := namedValuesToValues(args)
		if err != nil {
			return nil, err
		}
		return execer.Exec(TranslateQuery("postgres", query), dargs)
	}
	return nil, driver.ErrSkip
}

func (c *TranslatedConn) QueryContext(ctx context.Context, query string, args []driver.NamedValue) (driver.Rows, error) {
	if queryer, ok := c.conn.(driver.QueryerContext); ok {
		return queryer.QueryContext(ctx, TranslateQuery("postgres", query), args)
	}
	if queryer, ok := c.conn.(driver.Queryer); ok {
		dargs, err := namedValuesToValues(args)
		if err != nil {
			return nil, err
		}
		return queryer.Query(TranslateQuery("postgres", query), dargs)
	}
	return nil, driver.ErrSkip
}

func namedValuesToValues(named []driver.NamedValue) ([]driver.Value, error) {
	dargs := make([]driver.Value, len(named))
	for i, nv := range named {
		dargs[i] = nv.Value
	}
	return dargs, nil
}

func init() {
	sql.Register("postgres-translated", &TranslatedDriver{
		parent: &pq.Driver{},
	})
}

// TranslateQuery translates SQLite parameter placeholders "?" to PostgreSQL "$1", "$2", ...
func TranslateQuery(driverName, query string) string {
	if driverName != "postgres" && driverName != "postgresql" {
		return query
	}
	var sb strings.Builder
	paramNum := 1
	for {
		idx := strings.Index(query, "?")
		if idx == -1 {
			sb.WriteString(query)
			break
		}
		sb.WriteString(query[:idx])
		sb.WriteString("$")
		sb.WriteString(strconv.Itoa(paramNum))
		paramNum++
		query = query[idx+1:]
	}
	return sb.String()
}

// Config selects the backend. Zero value falls back to a file-based SQLite
// instance at the provided SQLitePath.
type Config struct {
	Driver     string // "sqlite" (default), "postgres" or "mariadb"/"mysql"
	DSN        string // backend-specific DSN; for sqlite, leave empty and use SQLitePath
	SQLitePath string // path to the sqlite database file (sqlite driver only)
}

// FromEnv reads DB_DRIVER / DB_DSN and merges them with the fallback path.
func FromEnv(sqlitePath string) Config {
	return Config{
		Driver:     strings.ToLower(strings.TrimSpace(os.Getenv("DB_DRIVER"))),
		DSN:        strings.TrimSpace(os.Getenv("DB_DSN")),
		SQLitePath: sqlitePath,
	}
}

// Open returns the configured *sql.DB plus the driver name expected by
// whatsmeow's sqlstore. Callers MUST Close the DB.
func Open(cfg Config) (*sql.DB, string, error) {
	driver := cfg.Driver
	if driver == "" {
		driver = "sqlite"
	}
	switch driver {
	case "sqlite", "sqlite3":
		path := cfg.SQLitePath
		if path == "" {
			path = "wacalls.db"
		}
		dsn := "file:" + path + "?_pragma=foreign_keys(1)&_pragma=busy_timeout(10000)&_pragma=journal_mode(WAL)"
		db, err := sql.Open("sqlite", dsn)
		if err != nil {
			return nil, "", err
		}
		db.SetMaxOpenConns(1)
		return db, "sqlite3", nil
	case "postgres", "postgresql":
		// Use our custom translated driver to parse SQLite syntax on the fly
		db, err := sql.Open("postgres-translated", cfg.DSN)
		if err != nil {
			return nil, "", err
		}
		db.SetMaxOpenConns(25)
		db.SetMaxIdleConns(5)
		return db, "postgres", nil
	case "mariadb", "mysql":
		return nil, "", fmt.Errorf("storage: DB_DRIVER=%s is not supported by whatsmeow; use SQLite or PostgreSQL", driver)
	default:
		return nil, "", fmt.Errorf("storage: unknown DB_DRIVER %q (use sqlite or postgres)", driver)
	}
}