package services

import (
	"database/sql"
	"expense-splitter/internal/models"
	"fmt"
)

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
