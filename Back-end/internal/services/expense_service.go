package services

import (
	"database/sql"
	"expense-splitter/internal/models"
	"fmt"
	"sort"
)

type ExpenseService struct {
	db *sql.DB
}

func NewExpenseService(db *sql.DB) *ExpenseService {
	return &ExpenseService{db: db}
}

func (s *ExpenseService) CreateExpense(groupID int, description string, amount float64, paidBy int, splitWith []int) (*models.Expense, error) {
	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// Create expense
	query := `
		INSERT INTO expenses (group_id, description, amount, paid_by)
		VALUES ($1, $2, $3, $4)
		RETURNING id, group_id, description, amount, paid_by, created_at
	`

	expense := &models.Expense{}
	err = tx.QueryRow(query, groupID, description, amount, paidBy).Scan(
		&expense.ID,
		&expense.GroupID,
		&expense.Description,
		&expense.Amount,
		&expense.PaidBy,
		&expense.CreatedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create expense: %v", err)
	}

	// Create splits
	splitAmount := amount / float64(len(splitWith))
	for _, userID := range splitWith {
		splitQuery := `
			INSERT INTO expense_splits (expense_id, user_id, amount)
			VALUES ($1, $2, $3)
		`
		if _, err := tx.Exec(splitQuery, expense.ID, userID, splitAmount); err != nil {
			return nil, fmt.Errorf("failed to create split: %v", err)
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return s.GetExpense(expense.ID)
}

func (s *ExpenseService) GetExpense(expenseID int) (*models.Expense, error) {
	query := `
		SELECT e.id, e.group_id, e.description, e.amount, e.paid_by, u.name, e.created_at
		FROM expenses e
		JOIN users u ON e.paid_by = u.id
		WHERE e.id = $1
	`

	expense := &models.Expense{}
	err := s.db.QueryRow(query, expenseID).Scan(
		&expense.ID,
		&expense.GroupID,
		&expense.Description,
		&expense.Amount,
		&expense.PaidBy,
		&expense.PaidByName,
		&expense.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	// Get splits
	splitsQuery := `
		SELECT es.id, es.expense_id, es.user_id, u.name, es.amount
		FROM expense_splits es
		JOIN users u ON es.user_id = u.id
		WHERE es.expense_id = $1
	`

	rows, err := s.db.Query(splitsQuery, expenseID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	splits := []models.Split{}
	for rows.Next() {
		var split models.Split
		if err := rows.Scan(&split.ID, &split.ExpenseID, &split.UserID, &split.UserName, &split.Amount); err != nil {
			return nil, err
		}
		splits = append(splits, split)
	}

	expense.Splits = splits
	return expense, nil
}

func (s *ExpenseService) GetGroupExpenses(groupID int) ([]models.Expense, error) {
	query := `
		SELECT e.id, e.group_id, e.description, e.amount, e.paid_by, u.name, e.created_at
		FROM expenses e
		JOIN users u ON e.paid_by = u.id
		WHERE e.group_id = $1
		ORDER BY e.created_at DESC
	`

	rows, err := s.db.Query(query, groupID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	expenses := []models.Expense{}
	for rows.Next() {
		var expense models.Expense
		if err := rows.Scan(
			&expense.ID,
			&expense.GroupID,
			&expense.Description,
			&expense.Amount,
			&expense.PaidBy,
			&expense.PaidByName,
			&expense.CreatedAt,
		); err != nil {
			return nil, err
		}

		// Get splits for this expense
		splitsQuery := `
			SELECT es.id, es.expense_id, es.user_id, u.name, es.amount
			FROM expense_splits es
			JOIN users u ON es.user_id = u.id
			WHERE es.expense_id = $1
		`

		splitRows, err := s.db.Query(splitsQuery, expense.ID)
		if err != nil {
			return nil, err
		}

		splits := []models.Split{}
		for splitRows.Next() {
			var split models.Split
			if err := splitRows.Scan(&split.ID, &split.ExpenseID, &split.UserID, &split.UserName, &split.Amount); err != nil {
				splitRows.Close()
				return nil, err
			}
			splits = append(splits, split)
		}
		splitRows.Close()

		expense.Splits = splits
		expenses = append(expenses, expense)
	}

	return expenses, nil
}

func (s *ExpenseService) UpdateExpense(expenseID int, description string, amount float64, paidBy int, splitWith []int) (*models.Expense, error) {
	tx, err := s.db.Begin()
	if err != nil {
		return nil, err
	}
	defer tx.Rollback()

	// Update expense
	query := `
		UPDATE expenses
		SET description = $1, amount = $2, paid_by = $3
		WHERE id = $4
	`
	if _, err := tx.Exec(query, description, amount, paidBy, expenseID); err != nil {
		return nil, err
	}

	// Delete old splits
	if _, err := tx.Exec("DELETE FROM expense_splits WHERE expense_id = $1", expenseID); err != nil {
		return nil, err
	}

	// Create new splits
	splitAmount := amount / float64(len(splitWith))
	for _, userID := range splitWith {
		splitQuery := `
			INSERT INTO expense_splits (expense_id, user_id, amount)
			VALUES ($1, $2, $3)
		`
		if _, err := tx.Exec(splitQuery, expenseID, userID, splitAmount); err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}

	return s.GetExpense(expenseID)
}

func (s *ExpenseService) DeleteExpense(expenseID int) error {
	query := `DELETE FROM expenses WHERE id = $1`
	_, err := s.db.Exec(query, expenseID)
	return err
}

func (s *ExpenseService) CalculateSettlements(groupID int) ([]models.Settlement, []models.Balance, error) {
	// Get all expenses and splits for the group
	query := `
		SELECT e.paid_by, es.user_id, es.amount, u1.name as paid_by_name, u2.name as user_name
		FROM expenses e
		JOIN expense_splits es ON e.id = es.expense_id
		JOIN users u1 ON e.paid_by = u1.id
		JOIN users u2 ON es.user_id = u2.id
		WHERE e.group_id = $1
	`

	rows, err := s.db.Query(query, groupID)
	if err != nil {
		return nil, nil, err
	}
	defer rows.Close()

	// Calculate balances: positive = owed to them, negative = they owe
	balanceMap := make(map[int]float64)
	nameMap := make(map[int]string)

	for rows.Next() {
		var paidBy, userID int
		var amount float64
		var paidByName, userName string

		if err := rows.Scan(&paidBy, &userID, &amount, &paidByName, &userName); err != nil {
			return nil, nil, err
		}

		nameMap[paidBy] = paidByName
		nameMap[userID] = userName

		// Person who paid gets positive balance
		balanceMap[paidBy] += amount
		// Person who owes gets negative balance
		balanceMap[userID] -= amount
	}

	// Adjust balances for confirmed payments
	paymentQuery := `
		SELECT from_user_id, to_user_id, amount
		FROM payment_confirmations
		WHERE group_id = $1 AND confirmed_by IS NOT NULL
	`

	paymentRows, err := s.db.Query(paymentQuery, groupID)
	if err != nil {
		return nil, nil, err
	}
	defer paymentRows.Close()

	for paymentRows.Next() {
		var fromUserID, toUserID int
		var amount float64

		if err := paymentRows.Scan(&fromUserID, &toUserID, &amount); err != nil {
			return nil, nil, err
		}

		balanceMap[fromUserID] += amount // from_user paid, so their debt decreases
		balanceMap[toUserID] -= amount   // to_user received, so their credit decreases
	}

	// Convert to balance slice
	balances := []models.Balance{}
	for userID, balance := range balanceMap {
		balances = append(balances, models.Balance{
			UserID:   userID,
			UserName: nameMap[userID],
			Balance:  balance,
		})
	}

	// Sort balances for consistent results
	sort.Slice(balances, func(i, j int) bool {
		return balances[i].UserID < balances[j].UserID
	})

	// Calculate optimal settlements using greedy algorithm
	settlements := optimizeSettlements(balanceMap, nameMap)

	return settlements, balances, nil
}

func (s *ExpenseService) CreatePaymentConfirmation(groupID, fromUserID, toUserID int, amount float64, slipURL string) (*models.PaymentConfirmation, error) {
	query := `
		INSERT INTO payment_confirmations (group_id, from_user_id, to_user_id, amount, slip_url)
		VALUES ($1, $2, $3, $4, $5)
		RETURNING id, group_id, from_user_id, to_user_id, amount, slip_url, confirmed_by, confirmed_at
	`

	var confirmedBy sql.NullInt64
	var confirmedAt sql.NullTime

	pc := &models.PaymentConfirmation{}
	err := s.db.QueryRow(query, groupID, fromUserID, toUserID, amount, slipURL).Scan(
		&pc.ID,
		&pc.GroupID,
		&pc.FromUserID,
		&pc.ToUserID,
		&pc.Amount,
		&pc.SlipURL,
		&confirmedBy,
		&confirmedAt,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create payment confirmation: %v", err)
	}

	// Handle nullable fields
	if confirmedBy.Valid {
		pc.ConfirmedBy = &confirmedBy.Int64
	}
	if confirmedAt.Valid {
		pc.ConfirmedAt = &confirmedAt.Time
	}

	return pc, nil
}

func (s *ExpenseService) GetPaymentConfirmations(groupID int) ([]models.PaymentConfirmation, error) {
	query := `
		SELECT pc.id, pc.group_id, pc.from_user_id, pc.to_user_id, pc.amount, pc.slip_url, pc.confirmed_by, pc.confirmed_at,
		       u1.name as from_name, u2.name as to_name, u3.name as confirmed_by_name
		FROM payment_confirmations pc
		JOIN users u1 ON pc.from_user_id = u1.id
		JOIN users u2 ON pc.to_user_id = u2.id
		LEFT JOIN users u3 ON pc.confirmed_by = u3.id
		WHERE pc.group_id = $1
		ORDER BY pc.confirmed_at DESC
	`

	rows, err := s.db.Query(query, groupID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var confirmations []models.PaymentConfirmation
	for rows.Next() {
		var pc models.PaymentConfirmation
		var fromName, toName string
		var confirmedByName sql.NullString
		var confirmedBy sql.NullInt64
		var confirmedAt sql.NullTime

		err := rows.Scan(
			&pc.ID, &pc.GroupID, &pc.FromUserID, &pc.ToUserID, &pc.Amount, &pc.SlipURL,
			&confirmedBy, &confirmedAt, &fromName, &toName, &confirmedByName,
		)
		if err != nil {
			return nil, err
		}

		// Handle nullable fields
		if confirmedBy.Valid {
			pc.ConfirmedBy = &confirmedBy.Int64
		}
		if confirmedAt.Valid {
			pc.ConfirmedAt = &confirmedAt.Time
		}

		// Add names to the struct
		pc.FromUserName = fromName
		pc.ToUserName = toName
		if confirmedByName.Valid {
			pc.ConfirmedByName = confirmedByName.String
		}

		confirmations = append(confirmations, pc)
	}

	return confirmations, nil
}

func (s *ExpenseService) ConfirmPayment(confirmationID, confirmedBy int) error {
	query := `
		UPDATE payment_confirmations
		SET confirmed_by = $1, confirmed_at = CURRENT_TIMESTAMP
		WHERE id = $2 AND confirmed_by IS NULL
	`

	result, err := s.db.Exec(query, confirmedBy, confirmationID)
	if err != nil {
		return err
	}

	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}

	if rowsAffected == 0 {
		return fmt.Errorf("payment confirmation not found or already confirmed")
	}

	return nil
}

// optimizeSettlements calculates minimum transactions needed to settle all debts
func optimizeSettlements(balanceMap map[int]float64, nameMap map[int]string) []models.Settlement {
	// Separate creditors (positive balance) and debtors (negative balance)
	type person struct {
		id      int
		balance float64
	}

	var creditors, debtors []person
	for id, balance := range balanceMap {
		if balance > 0.01 { // creditor
			creditors = append(creditors, person{id: id, balance: balance})
		} else if balance < -0.01 { // debtor
			debtors = append(debtors, person{id: id, balance: -balance})
		}
	}

	// Sort by amount (largest first)
	sort.Slice(creditors, func(i, j int) bool {
		return creditors[i].balance > creditors[j].balance
	})
	sort.Slice(debtors, func(i, j int) bool {
		return debtors[i].balance > debtors[j].balance
	})

	settlements := []models.Settlement{}
	i, j := 0, 0

	for i < len(creditors) && j < len(debtors) {
		creditor := &creditors[i]
		debtor := &debtors[j]

		amount := creditor.balance
		if debtor.balance < amount {
			amount = debtor.balance
		}

		if amount > 0.01 {
			settlements = append(settlements, models.Settlement{
				From:     debtor.id,
				FromName: nameMap[debtor.id],
				To:       creditor.id,
				ToName:   nameMap[creditor.id],
				Amount:   amount,
			})
		}

		creditor.balance -= amount
		debtor.balance -= amount

		if creditor.balance < 0.01 {
			i++
		}
		if debtor.balance < 0.01 {
			j++
		}
	}

	return settlements
}
