package services

import (
	"database/sql"
	"expense-splitter/internal/models"
	"fmt"
)

type GroupService struct {
	db *sql.DB
}

func NewGroupService(db *sql.DB) *GroupService {
	return &GroupService{db: db}
}

func (s *GroupService) CreateGroup(name, description string, createdBy int) (*models.Group, error) {
	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// Create group
	query := `
		INSERT INTO groups (name, description, created_by)
		VALUES ($1, $2, $3)
		RETURNING id, name, description, created_by, created_at
	`

	group := &models.Group{}
	err = tx.QueryRow(query, name, description, createdBy).Scan(
		&group.ID,
		&group.Name,
		&group.Description,
		&group.CreatedBy,
		&group.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create group: %v", err)
	}

	// Add creator as member
	memberQuery := `
		INSERT INTO group_members (group_id, user_id)
		VALUES ($1, $2)
	`
	if _, err := tx.Exec(memberQuery, group.ID, createdBy); err != nil {
		return nil, fmt.Errorf("failed to add creator as member: %v", err)
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return group, nil
}

func (s *GroupService) GetGroup(groupID int) (*models.Group, error) {
	query := `
		SELECT id, name, description, created_by, created_at
		FROM groups
		WHERE id = $1
	`

	group := &models.Group{}
	err := s.db.QueryRow(query, groupID).Scan(
		&group.ID,
		&group.Name,
		&group.Description,
		&group.CreatedBy,
		&group.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("group not found: %v", err)
	}

	// Get members
	membersQuery := `
		SELECT u.id, u.email, u.name, u.created_at
		FROM users u
		JOIN group_members gm ON u.id = gm.user_id
		WHERE gm.group_id = $1
	`

	rows, err := s.db.Query(membersQuery, groupID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	members := []models.User{}
	for rows.Next() {
		var user models.User
		if err := rows.Scan(&user.ID, &user.Email, &user.Name, &user.CreatedAt); err != nil {
			return nil, err
		}
		members = append(members, user)
	}

	group.Members = members
	return group, nil
}

func (s *GroupService) GetUserGroups(userID int) ([]models.Group, error) {
	query := `
		SELECT g.id, g.name, g.description, g.created_by, g.created_at
		FROM groups g
		JOIN group_members gm ON g.id = gm.group_id
		WHERE gm.user_id = $1
		ORDER BY g.created_at DESC
	`

	rows, err := s.db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	groups := []models.Group{}
	for rows.Next() {
		var group models.Group
		if err := rows.Scan(
			&group.ID,
			&group.Name,
			&group.Description,
			&group.CreatedBy,
			&group.CreatedAt,
		); err != nil {
			return nil, err
		}
		groups = append(groups, group)
	}

	return groups, nil
}

func (s *GroupService) AddMember(groupID, userID int) error {
	query := `
		INSERT INTO group_members (group_id, user_id)
		VALUES ($1, $2)
		ON CONFLICT DO NOTHING
	`

	_, err := s.db.Exec(query, groupID, userID)
	return err
}

func (s *GroupService) RemoveMember(groupID, userID int) error {
	query := `
		DELETE FROM group_members
		WHERE group_id = $1 AND user_id = $2
	`

	_, err := s.db.Exec(query, groupID, userID)
	return err
}

func (s *GroupService) IsUserMember(groupID, userID int) (bool, error) {
	query := `
		SELECT EXISTS(
			SELECT 1 FROM group_members
			WHERE group_id = $1 AND user_id = $2
		)
	`

	var exists bool
	err := s.db.QueryRow(query, groupID, userID).Scan(&exists)
	return exists, err
}
