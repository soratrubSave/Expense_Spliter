package services

import (
	"database/sql"
	"errors"
	"expense-splitter/internal/models"
	"fmt"

	"github.com/lib/pq"
)

var ErrEmailAlreadyExists = errors.New("email already exists")

type UserService struct {
	db *sql.DB
}

func NewUserService(db *sql.DB) *UserService {
	return &UserService{db: db}
}

func (s *UserService) CreateUser(email, name, hashedPassword string) (*models.User, error) {
	query := `
		INSERT INTO users (email, name, password)
		VALUES ($1, $2, $3)
		RETURNING id, email, name, created_at
	`

	user := &models.User{}
	err := s.db.QueryRow(query, email, name, hashedPassword).Scan(
		&user.ID,
		&user.Email,
		&user.Name,
		&user.CreatedAt,
	)

	if err != nil {

		if pqErr, ok := err.(*pq.Error); ok && pqErr.Code == "23505" {
			return nil, ErrEmailAlreadyExists
		}
		return nil, fmt.Errorf("failed to create user: %v", err)
	}

	return user, nil
}

func (s *UserService) GetUserByEmail(email string) (*models.User, error) {
	query := `
		SELECT id, email, name, password, created_at
		FROM users
		WHERE email = $1
	`

	user := &models.User{}
	err := s.db.QueryRow(query, email).Scan(
		&user.ID,
		&user.Email,
		&user.Name,
		&user.Password,
		&user.CreatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("user not found: %v", err)
	}

	return user, nil
}

func (s *UserService) GetUserByID(id int) (*models.User, error) {
	query := `
		SELECT id, email, name, created_at
		FROM users
		WHERE id = $1
	`

	user := &models.User{}
	err := s.db.QueryRow(query, id).Scan(
		&user.ID,
		&user.Email,
		&user.Name,
		&user.CreatedAt,
	)

	if err != nil {
		return nil, fmt.Errorf("user not found: %v", err)
	}

	return user, nil
}

func (s *UserService) GetUsersByIDs(ids []int) ([]models.User, error) {
	if len(ids) == 0 {
		return []models.User{}, nil
	}

	query := `
		SELECT id, email, name, created_at
		FROM users
		WHERE id = ANY($1)
	`

	rows, err := s.db.Query(query, ids)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := []models.User{}
	for rows.Next() {
		var user models.User
		if err := rows.Scan(&user.ID, &user.Email, &user.Name, &user.CreatedAt); err != nil {
			return nil, err
		}
		users = append(users, user)
	}

	return users, nil
}

func (s *UserService) SearchUsers(query string, currentUserID int, excludeGroupID int) ([]models.User, error) {
	if query == "" {
		return []models.User{}, nil
	}

	// Search only friends by email or name, exclude current user and users already in the group
	searchQuery := `
		SELECT DISTINCT u.id, u.email, u.name, u.created_at
		FROM users u
		JOIN friendships f ON u.id = f.friend_id
		WHERE f.user_id = $1
		AND (u.email ILIKE $2 OR u.name ILIKE $2)
		AND u.id != $1
		AND u.id NOT IN (
			SELECT user_id FROM group_members WHERE group_id = $3
		)
		LIMIT 10
	`

	rows, err := s.db.Query(searchQuery, currentUserID, "%"+query+"%", excludeGroupID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := []models.User{}
	for rows.Next() {
		var user models.User
		if err := rows.Scan(&user.ID, &user.Email, &user.Name, &user.CreatedAt); err != nil {
			return nil, err
		}
		users = append(users, user)
	}

	return users, nil
}

func (s *UserService) SearchAllUsers(query string, currentUserID int) ([]models.User, error) {
	if query == "" {
		return []models.User{}, nil
	}

	// Search all users by email or name, exclude current user
	searchQuery := `
		SELECT DISTINCT u.id, u.email, u.name, u.created_at
		FROM users u
		WHERE (u.email ILIKE $1 OR u.name ILIKE $1)
		AND u.id != $2
		ORDER BY u.name
		LIMIT 20
	`

	rows, err := s.db.Query(searchQuery, "%"+query+"%", currentUserID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	users := []models.User{}
	for rows.Next() {
		var user models.User
		if err := rows.Scan(&user.ID, &user.Email, &user.Name, &user.CreatedAt); err != nil {
			return nil, err
		}
		users = append(users, user)
	}

	return users, nil
}
