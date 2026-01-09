package handlers

import (
	"expense-splitter/internal/models"
	"expense-splitter/internal/services"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

type FriendHandler struct {
	friendService *services.FriendService
	userService   *services.UserService
}

func NewFriendHandler(friendService *services.FriendService, userService *services.UserService) *FriendHandler {
	return &FriendHandler{
		friendService: friendService,
		userService:   userService,
	}
}

func (h *FriendHandler) AddFriend(c *fiber.Ctx) error {
	userID := c.Locals("userID").(int)

	var req models.AddFriendRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	// Check if friend exists
	_, err := h.userService.GetUserByID(req.FriendID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "User not found",
		})
	}

	if err := h.friendService.AddFriend(userID, req.FriendID); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Friend added successfully",
	})
}

func (h *FriendHandler) RemoveFriend(c *fiber.Ctx) error {
	userID := c.Locals("userID").(int)
	friendID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid friend ID",
		})
	}

	if err := h.friendService.RemoveFriend(userID, friendID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Friend removed successfully",
	})
}

func (h *FriendHandler) GetFriends(c *fiber.Ctx) error {
	userID := c.Locals("userID").(int)

	friends, err := h.friendService.GetFriends(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(friends)
}

func (h *FriendHandler) SearchFriends(c *fiber.Ctx) error {
	userID := c.Locals("userID").(int)
	query := c.Query("q")

	friends, err := h.friendService.SearchFriends(userID, query)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(friends)
}
