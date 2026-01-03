package handlers

import (
	"expense-splitter/internal/models"
	"expense-splitter/internal/services"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

type ExpenseHandler struct {
	expenseService *services.ExpenseService
}

func NewExpenseHandler(expenseService *services.ExpenseService) *ExpenseHandler {
	return &ExpenseHandler{expenseService: expenseService}
}

func (h *ExpenseHandler) CreateExpense(c *fiber.Ctx) error {
	userID := c.Locals("userID").(int)

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
		if id == userID {
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
