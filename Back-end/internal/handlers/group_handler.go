package handlers

import (
	"expense-splitter/internal/models"
	"expense-splitter/internal/services"
	"strconv"

	"github.com/gofiber/fiber/v2"
)

type GroupHandler struct {
	groupService *services.GroupService
}

func NewGroupHandler(groupService *services.GroupService) *GroupHandler {
	return &GroupHandler{groupService: groupService}
}

func (h *GroupHandler) CreateGroup(c *fiber.Ctx) error {
	userID := c.Locals("userID").(int)

	var req models.CreateGroupRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if req.Name == "" {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Group name is required",
		})
	}

	group, err := h.groupService.CreateGroup(req.Name, req.Description, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.Status(fiber.StatusCreated).JSON(group)
}

func (h *GroupHandler) GetUserGroups(c *fiber.Ctx) error {
	userID := c.Locals("userID").(int)

	groups, err := h.groupService.GetUserGroups(userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(groups)
}

func (h *GroupHandler) GetGroup(c *fiber.Ctx) error {
	userID := c.Locals("userID").(int)
	groupID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid group ID",
		})
	}

	// Check if user is member
	isMember, err := h.groupService.IsUserMember(groupID, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	if !isMember {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "You are not a member of this group",
		})
	}

	group, err := h.groupService.GetGroup(groupID)
	if err != nil {
		return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
			"error": "Group not found",
		})
	}

	return c.JSON(group)
}

func (h *GroupHandler) AddMember(c *fiber.Ctx) error {
	userID := c.Locals("userID").(int)
	groupID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid group ID",
		})
	}

	// Check if user is member
	isMember, err := h.groupService.IsUserMember(groupID, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	if !isMember {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "You are not a member of this group",
		})
	}

	var req models.AddMemberRequest
	if err := c.BodyParser(&req); err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid request body",
		})
	}

	if err := h.groupService.AddMember(groupID, req.UserID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Member added successfully",
	})
}

func (h *GroupHandler) RemoveMember(c *fiber.Ctx) error {
	userID := c.Locals("userID").(int)
	groupID, err := strconv.Atoi(c.Params("id"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid group ID",
		})
	}

	memberID, err := strconv.Atoi(c.Params("userId"))
	if err != nil {
		return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
			"error": "Invalid user ID",
		})
	}

	// Check if requester is member
	isMember, err := h.groupService.IsUserMember(groupID, userID)
	if err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}
	if !isMember {
		return c.Status(fiber.StatusForbidden).JSON(fiber.Map{
			"error": "You are not a member of this group",
		})
	}

	if err := h.groupService.RemoveMember(groupID, memberID); err != nil {
		return c.Status(fiber.StatusInternalServerError).JSON(fiber.Map{
			"error": err.Error(),
		})
	}

	return c.JSON(fiber.Map{
		"message": "Member removed successfully",
	})
}
