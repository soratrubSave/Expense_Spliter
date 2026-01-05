package handlers

import (
	"context"
	"expense-splitter/internal/models"
	"expense-splitter/internal/services"
	"fmt"
	"os"
	"strconv"

	"github.com/cloudinary/cloudinary-go/v2"
	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
	"github.com/gofiber/fiber/v2"
)

type ExpenseHandler struct {
	expenseService *services.ExpenseService
}

func NewExpenseHandler(expenseService *services.ExpenseService) *ExpenseHandler {
	return &ExpenseHandler{expenseService: expenseService}
}

func (h *ExpenseHandler) CreateExpense(c *fiber.Ctx) error {
	var req models.CreateExpenseRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if req.Description == "" || req.Amount <= 0 || len(req.SplitWith) == 0 {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Description, amount, and split_with are required",
		})
	}

	// Check if user is member of the group
	isMember := false
	for _, id := range req.SplitWith {
		if id == req.PaidBy {
			isMember = true
			break
		}
	}
	if !isMember {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "You must be in the split list",
		})
	}

	expense, err := h.expenseService.CreateExpense(
		req.GroupID,
		req.Description,
		req.Amount,
		req.PaidBy,
		req.SplitWith,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(expense)
}

func (h *ExpenseHandler) GetGroupExpenses(c *fiber.Ctx) error {
	groupID, err := strconv.Atoi(c.Params("groupId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid group ID",
		})
	}

	expenses, err := h.expenseService.GetGroupExpenses(groupID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(expenses)
}

func (h *ExpenseHandler) GetExpense(c *fiber.Ctx) error {
	expenseID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid expense ID",
		})
	}

	expense, err := h.expenseService.GetExpense(expenseID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Expense not found",
		})
	}

	return c.JSON(expense)
}

func (h *ExpenseHandler) UpdateExpense(c *fiber.Ctx) error {
	expenseID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid expense ID",
		})
	}

	var req models.CreateExpenseRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	expense, err := h.expenseService.UpdateExpense(
		expenseID,
		req.Description,
		req.Amount,
		req.PaidBy,
		req.SplitWith,
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(expense)
}

func (h *ExpenseHandler) DeleteExpense(c *fiber.Ctx) error {
	expenseID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid expense ID",
		})
	}

	if err := h.expenseService.DeleteExpense(expenseID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Expense deleted successfully",
	})
}

func (h *ExpenseHandler) GetSettlements(c *fiber.Ctx) error {
	groupID, err := strconv.Atoi(c.Params("groupId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid group ID",
		})
	}

	settlements, balances, err := h.expenseService.CalculateSettlements(groupID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"settlements": settlements,
		"balances":    balances,
	})
}

func (h *ExpenseHandler) UploadSlip(c *fiber.Ctx) error {
	userID := c.Locals("userID").(int)

	// Parse multipart form
	file, err := c.FormFile("slip")
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "No file uploaded",
		})
	}

	// Validate file type
	if file.Header.Get("Content-Type") != "image/jpeg" && file.Header.Get("Content-Type") != "image/png" && file.Header.Get("Content-Type") != "image/jpg" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Only JPEG and PNG files are allowed",
		})
	}

	// Open the uploaded file
	src, err := file.Open()
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to open file",
		})
	}
	defer src.Close()

	// Upload to Cloudinary
	cld, err := cloudinary.NewFromParams(
		os.Getenv("CLOUDINARY_CLOUD_NAME"),
		os.Getenv("CLOUDINARY_API_KEY"),
		os.Getenv("CLOUDINARY_API_SECRET"),
	)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to initialize Cloudinary",
		})
	}

	// Generate unique public ID
	publicID := fmt.Sprintf("expense_slips/%d_%s", userID, file.Filename)

	uploadResult, err := cld.Upload.Upload(context.Background(), src, uploader.UploadParams{
		PublicID: publicID,
		Folder:   "expense_slips",
	})
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": "Failed to upload to Cloudinary",
		})
	}

	// Return Cloudinary URL
	return c.JSON(fiber.Map{
		"slip_url": uploadResult.SecureURL,
	})
}

func (h *ExpenseHandler) CreatePaymentConfirmation(c *fiber.Ctx) error {
	userID := c.Locals("userID").(int)

	var req models.CreatePaymentConfirmationRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if req.GroupID == 0 || req.ToUserID == 0 || req.Amount <= 0 || req.SlipURL == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Group ID, to user ID, amount, and slip URL are required",
		})
	}

	pc, err := h.expenseService.CreatePaymentConfirmation(req.GroupID, userID, req.ToUserID, req.Amount, req.SlipURL)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(pc)
}

func (h *ExpenseHandler) GetPaymentConfirmations(c *fiber.Ctx) error {
	groupID, err := strconv.Atoi(c.Params("groupId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid group ID",
		})
	}

	confirmations, err := h.expenseService.GetPaymentConfirmations(groupID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(confirmations)
}

func (h *ExpenseHandler) ConfirmPayment(c *fiber.Ctx) error {
	confirmationID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid confirmation ID",
		})
	}

	userID := c.Locals("userID").(int)

	if err := h.expenseService.ConfirmPayment(confirmationID, userID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Payment confirmed successfully",
	})
}
