package main

import (
	"expense-splitter/internal/database"
	"expense-splitter/internal/handlers"
	"expense-splitter/internal/services"
	"log"
	"os"
	"path/filepath"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/joho/godotenv"
)

func main() {
	// แสดง working directory ปัจจุบัน
	wd, _ := os.Getwd()
	log.Printf("Working directory: %s", wd)

	// ลองหา .env ใน path ต่างๆ
	envPaths := []string{
		"configs/.env",
		".env",
		filepath.Join(wd, "configs", ".env"),
	}

	loaded := false
	for _, path := range envPaths {
		if err := godotenv.Load(path); err == nil {
			log.Printf("✅ Loaded .env from: %s", path)
			loaded = true
			break
		}
	}

	if !loaded {
		log.Println("⚠️ No .env file found, using environment variables")
	}

	// Debug: แสดงค่าที่อ่านได้
	log.Printf("DB_HOST: '%s'", os.Getenv("DB_HOST"))
	log.Printf("DB_PORT: '%s'", os.Getenv("DB_PORT"))
	log.Printf("DB_USER: '%s'", os.Getenv("DB_USER"))
	log.Printf("DB_PASSWORD: '%s'", os.Getenv("DB_PASSWORD"))
	log.Printf("DB_NAME: '%s'", os.Getenv("DB_NAME"))

	// Connect to database
	db, err := database.Connect()
	if err != nil {
		log.Fatal("Failed to connect to database:", err)
	}
	defer db.Close()

	// ... ส่วนที่เหลือเหมือนเดิม

	// Run migrations
	if err := database.RunMigrations(db); err != nil {
		log.Fatal("Failed to run migrations:", err)
	}

	// Initialize services
	userService := services.NewUserService(db)
	groupService := services.NewGroupService(db)
	expenseService := services.NewExpenseService(db)

	// Initialize handlers
	authHandler := handlers.NewAuthHandler(userService)
	groupHandler := handlers.NewGroupHandler(groupService, userService)
	expenseHandler := handlers.NewExpenseHandler(expenseService)

	// Create Fiber app
	app := fiber.New(fiber.Config{
		ErrorHandler: func(c *fiber.Ctx, err error) error {
			code := fiber.StatusInternalServerError
			if e, ok := err.(*fiber.Error); ok {
				code = e.Code
			}
			return c.Status(code).JSON(fiber.Map{
				"error": err.Error(),
			})
		},
	})

	// Middleware
	app.Use(logger.New())
	app.Use(cors.New())

	// Routes
	api := app.Group("/api")

	// Auth routes
	auth := api.Group("/auth")
	auth.Post("/register", authHandler.Register)
	auth.Post("/login", authHandler.Login)

	// Protected routes
	api.Use(handlers.AuthMiddleware)

	// Group routes
	groups := api.Group("/groups")
	groups.Post("/", groupHandler.CreateGroup)
	groups.Get("/", groupHandler.GetUserGroups)
	groups.Get("/:id", groupHandler.GetGroup)
	groups.Get("/:id/search-users", groupHandler.SearchUsers)
	groups.Put("/:id", groupHandler.UpdateGroup)
	groups.Delete("/:id", groupHandler.DeleteGroup)
	groups.Post("/:id/members", groupHandler.AddMember)
	groups.Delete("/:id/members/:userId", groupHandler.RemoveMember)

	// Expense routes
	expenses := api.Group("/expenses")
	expenses.Post("/", expenseHandler.CreateExpense)
	expenses.Get("/group/:groupId", expenseHandler.GetGroupExpenses)
	expenses.Get("/:id", expenseHandler.GetExpense)
	expenses.Put("/:id", expenseHandler.UpdateExpense)
	expenses.Delete("/:id", expenseHandler.DeleteExpense)

	// Settlement routes
	settlements := api.Group("/settlements")
	settlements.Get("/group/:groupId", expenseHandler.GetSettlements)

	// Payment confirmation routes
	payments := api.Group("/payments")
	payments.Post("/upload-slip", expenseHandler.UploadSlip)
	payments.Post("/confirmations", expenseHandler.CreatePaymentConfirmation)
	payments.Get("/confirmations/group/:groupId", expenseHandler.GetPaymentConfirmations)
	payments.Put("/confirmations/:id/confirm", expenseHandler.ConfirmPayment)

	// Start server
	port := os.Getenv("SERVER_PORT")
	if port == "" {
		port = "8080"
	}

	log.Printf("Server starting on port %s", port)
	if err := app.Listen(":" + port); err != nil {
		log.Fatal("Failed to start server:", err)
	}
}
