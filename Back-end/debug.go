package main

import (
	"database/sql"
	"fmt"
	"os"

	_ "github.com/lib/pq"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load("configs/.env"); err != nil {
		fmt.Printf("Error loading .env file: %v\n", err)
		fmt.Println("No .env file found, using environment variables")
	} else {
		fmt.Println(".env file loaded successfully")
	}

	host := os.Getenv("DB_HOST")
	port := os.Getenv("DB_PORT")
	user := os.Getenv("DB_USER")
	password := os.Getenv("DB_PASSWORD")
	dbname := os.Getenv("DB_NAME")
	sslmode := os.Getenv("DB_SSLMODE")

	fmt.Printf("DB_HOST: %s\n", host)
	fmt.Printf("DB_PORT: %s\n", port)
	fmt.Printf("DB_USER: %s\n", user)
	fmt.Printf("DB_PASSWORD: %s\n", password)
	fmt.Printf("DB_NAME: %s\n", dbname)
	fmt.Printf("DB_SSLMODE: %s\n", sslmode)

	connStr := fmt.Sprintf(
		"host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		host, port, user, password, dbname, sslmode,
	)

	fmt.Printf("Connection string: %s\n", connStr)

	db, err := sql.Open("postgres", connStr)
	if err != nil {
		fmt.Printf("Error opening database: %v\n", err)
		return
	}
	defer db.Close()

	if err := db.Ping(); err != nil {
		fmt.Printf("Error pinging database: %v\n", err)
		return
	}

	fmt.Println("Successfully connected to database!")
}