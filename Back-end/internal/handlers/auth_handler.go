package handlers

import (
	"expense-splitter/internal/models"
	"expense-splitter/internal/services"
	"expense-splitter/pkg/utils"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/golang-jwt/jwt/v5"
)

type AuthHandler struct {
	userService *services.UserService
}

func NewAuthHandler(userService *services.UserService) *AuthHandler {
	return &AuthHandler{userService: userService}
}

func (h *AuthHandler) Register(c *fiber.Ctx) error {
	var req models.RegisterRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Validate input
	if req.Email == "" || req.Name == "" || req.Password == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Email, name, and password are required",
		})
	}

	// Hash password
	hashedPassword, err := utils.HashPassword(req.Password)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to process password",
		})
	}

	// Create user
	user, err := h.userService.CreateUser(req.Email, req.Name, hashedPassword)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	// Generate token
	token, err := generateToken(user.ID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to generate token",
		})
	}

	return c.Status(fiber.StatusCreated).JSON(models.AuthResponse{
		Token: token,
		User:  *user,
	})
}

func (h *AuthHandler) Login(c *fiber.Ctx) error {
	var req models.LoginRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Find user
	user, err := h.userService.GetUserByEmail(req.Email)
	if err != nil {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid email or password",
		})
	}

	// Check password
	if !utils.CheckPassword(req.Password, user.Password) {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid email or password",
		})
	}

	// Generate token
	token, err := generateToken(user.ID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to generate token",
		})
	}

	return c.JSON(models.AuthResponse{
		Token: token,
		User:  *user,
	})
}

func generateToken(userID int) (string, error) {
	expireHours := 72
	if h := os.Getenv("JWT_EXPIRE_HOURS"); h != "" {
		if hours, err := strconv.Atoi(h); err == nil {
			expireHours = hours
		}
	}

	claims := jwt.MapClaims{
		"user_id": userID,
		"exp":     time.Now().Add(time.Hour * time.Duration(expireHours)).Unix(),
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	secret := os.Getenv("JWT_SECRET")
	return token.SignedString([]byte(secret))
}

func AuthMiddleware(c *fiber.Ctx) error {
	authHeader := c.Get("Authorization")
	if authHeader == "" {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Missing authorization header",
		})
	}

	tokenString := strings.TrimPrefix(authHeader, "Bearer ")
	if tokenString == authHeader {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid authorization format",
		})
	}

	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		return []byte(os.Getenv("JWT_SECRET")), nil
	})

	if err != nil || !token.Valid {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid token",
		})
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return c.Status(fiber.StatusUnauthorized).JSON(fiber.Map{
			"error": "Invalid token claims",
		})
	}

	userID := int(claims["user_id"].(float64))
	c.Locals("userID", userID)

	return c.Next()
}
