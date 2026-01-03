package database

import (
	"database/sql"
	"fmt"
	"os"

	_ "github.com/lib/pq"
)

func Connect() (*sql.DB, error) {
	host := os.Getenv("DB_HOST")
	port := os.Getenv("DB_PORT")
	user := os.Getenv("DB_USER")
	password := os.Getenv("DB_PASSWORD")
	dbname := os.Getenv("DB_NAME")
	sslmode := os.Getenv("DB_SSLMODE")

	connStr := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		host, port, user, password, dbname, sslmode,
	)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		return nil, err
	}

	if err := db.Ping(); err != nil {
		return nil, err
	}

	return db, nil
}

func RunMigrations(db *sql.DB) error {
	migrations := []string{
		`CREATE TABLE IF NOT EXISTS users (
			id SERIAL PRIMARY KEY,
			email VARCHAR(255) UNIQUE NOT NULL,
			name VARCHAR(255) NOT NULL,
			password VARCHAR(255) NOT NULL,
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,

		`CREATE TABLE IF NOT EXISTS groups (
			id SERIAL PRIMARY KEY,
			name VARCHAR(255) NOT NULL,
			description TEXT,
			created_by INTEGER REFERENCES users(id),
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,

		`CREATE TABLE IF NOT EXISTS group_members (
			group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
			user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
			joined_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
			PRIMARY KEY (group_id, user_id)
		)`,

		`CREATE TABLE IF NOT EXISTS expenses (
			id SERIAL PRIMARY KEY,
			group_id INTEGER REFERENCES groups(id) ON DELETE CASCADE,
			description TEXT NOT NULL,
			amount DECIMAL(10, 2) NOT NULL,
			paid_by INTEGER REFERENCES users(id),
			created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
		)`,

		`CREATE TABLE IF NOT EXISTS expense_splits (
			id SERIAL PRIMARY KEY,
			expense_id INTEGER REFERENCES expenses(id) ON DELETE CASCADE,
			user_id INTEGER REFERENCES users(id),
			amount DECIMAL(10, 2) NOT NULL
		)`,
	}

	for _, migration := range migrations {
		if _, err := db.Exec(migration); err != nil {
			return fmt.Errorf("migration failed: %v", err)
		}
	}

	return nil
}
