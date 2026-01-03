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
