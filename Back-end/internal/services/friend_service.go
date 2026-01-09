package services

import (
	"database/sql"
	"expense-splitter/internal/models"
	"fmt"
)

type FriendService struct {
	db *sql.DB
}

func NewFriendService(db *sql.DB) *FriendService {
	return &FriendService{db: db}
}

func (s *FriendService) AddFriend(userID, friendID int) error {
	// Check if trying to add self
	if userID == friendID {
		return fmt.Errorf("cannot add yourself as a friend")
	}

	// Check if friendship already exists
	exists, err := s.AreFriends(userID, friendID)
	if err != nil {
		return err
	}
	if exists {
		return fmt.Errorf("friendship already exists")
	}

	// Create bidirectional friendship
	tx, err := s.db.Begin()
	if err != nil {
		return err
	}
	defer tx.Rollback()

	// Insert friendship in both directions
	query := `
		INSERT INTO friendships (user_id, friend_id)
		VALUES ($1, $2), ($2, $1)
		ON CONFLICT DO NOTHING
	`

	_, err = tx.Exec(query, userID, friendID)
	if err != nil {
		return fmt.Errorf("failed to add friend: %v", err)
	}

	if err := tx.Commit(); err != nil {
		return err
	}

	return nil
}

func (s *FriendService) RemoveFriend(userID, friendID int) error {
	// Remove bidirectional friendship
	query := `
		DELETE FROM friendships
		WHERE (user_id = $1 AND friend_id = $2)
		OR (user_id = $2 AND friend_id = $1)
	`

	_, err := s.db.Exec(query, userID, friendID)
	return err
}

func (s *FriendService) GetFriends(userID int) ([]models.User, error) {
	query := `
		SELECT u.id, u.email, u.name, u.created_at
		FROM users u
		JOIN friendships f ON u.id = f.friend_id
		WHERE f.user_id = $1
		ORDER BY f.created_at DESC
	`

	rows, err := s.db.Query(query, userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	friends := []models.User{}
	for rows.Next() {
		var user models.User
		if err := rows.Scan(&user.ID, &user.Email, &user.Name, &user.CreatedAt); err != nil {
			return nil, err
		}
		friends = append(friends, user)
	}

	return friends, nil
}

func (s *FriendService) AreFriends(userID, friendID int) (bool, error) {
	query := `
		SELECT EXISTS(
			SELECT 1 FROM friendships
			WHERE user_id = $1 AND friend_id = $2
		)
	`

	var exists bool
	err := s.db.QueryRow(query, userID, friendID).Scan(&exists)
	return exists, err
}

func (s *FriendService) SearchFriends(userID int, query string) ([]models.User, error) {
	if query == "" {
		return []models.User{}, nil
	}

	// Search only friends by email or name
	searchQuery := `
		SELECT DISTINCT u.id, u.email, u.name, u.created_at
		FROM users u
		JOIN friendships f ON u.id = f.friend_id
		WHERE f.user_id = $1
		AND (u.email ILIKE $2 OR u.name ILIKE $2)
		ORDER BY u.name
		LIMIT 20
	`

	rows, err := s.db.Query(searchQuery, userID, "%"+query+"%")
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	friends := []models.User{}
	for rows.Next() {
		var user models.User
		if err := rows.Scan(&user.ID, &user.Email, &user.Name, &user.CreatedAt); err != nil {
			return nil, err
		}
		friends = append(friends, user)
	}

	return friends, nil
}
