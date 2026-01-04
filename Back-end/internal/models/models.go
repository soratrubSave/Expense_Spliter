package models

import "time"

type User struct {
	ID        int       `json:"id"`
	Email     string    `json:"email"`
	Name      string    `json:"name"`
	Password  string    `json:"-"`
	CreatedAt time.Time `json:"created_at"`
}

type Group struct {
	ID          int       `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	CreatedBy   int       `json:"created_by"`
	CreatedAt   time.Time `json:"created_at"`
	Members     []User    `json:"members,omitempty"`
}

type GroupMember struct {
	GroupID  int       `json:"group_id"`
	UserID   int       `json:"user_id"`
	JoinedAt time.Time `json:"joined_at"`
}

type Expense struct {
	ID          int       `json:"id"`
	GroupID     int       `json:"group_id"`
	Description string    `json:"description"`
	Amount      float64   `json:"amount"`
	PaidBy      int       `json:"paid_by"`
	PaidByName  string    `json:"paid_by_name,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	Splits      []Split   `json:"splits,omitempty"`
}

type Split struct {
	ID        int     `json:"id"`
	ExpenseID int     `json:"expense_id"`
	UserID    int     `json:"user_id"`
	UserName  string  `json:"user_name,omitempty"`
	Amount    float64 `json:"amount"`
}

type Settlement struct {
	From        int        `json:"from_user_id"`
	FromName    string     `json:"from_user_name"`
	To          int        `json:"to_user_id"`
	ToName      string     `json:"to_user_name"`
	Amount      float64    `json:"amount"`
	Confirmed   bool       `json:"confirmed"`
	ConfirmedAt *time.Time `json:"confirmed_at,omitempty"`
}

type Balance struct {
	UserID   int     `json:"user_id"`
	UserName string  `json:"user_name"`
	Balance  float64 `json:"balance"`
}

type PaymentConfirmation struct {
	ID              int        `json:"id"`
	GroupID         int        `json:"group_id"`
	FromUserID      int        `json:"from_user_id"`
	FromUserName    string     `json:"from_user_name,omitempty"`
	ToUserID        int        `json:"to_user_id"`
	ToUserName      string     `json:"to_user_name,omitempty"`
	Amount          float64    `json:"amount"`
	SlipURL         string     `json:"slip_url,omitempty"`
	ConfirmedBy     *int64     `json:"confirmed_by,omitempty"`
	ConfirmedByName string     `json:"confirmed_by_name,omitempty"`
	ConfirmedAt     *time.Time `json:"confirmed_at,omitempty"`
}

// Request/Response DTOs
type RegisterRequest struct {
	Email    string `json:"email"`
	Name     string `json:"name"`
	Password string `json:"password"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type AuthResponse struct {
	Token string `json:"token"`
	User  User   `json:"user"`
}

type CreateGroupRequest struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

type AddMemberRequest struct {
	UserID int `json:"user_id"`
}

type CreateExpenseRequest struct {
	GroupID     int     `json:"group_id"`
	Description string  `json:"description"`
	Amount      float64 `json:"amount"`
	PaidBy      int     `json:"paid_by"`
	SplitWith   []int   `json:"split_with"` // User IDs to split with
}
