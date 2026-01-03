const API_BASE_URL = "http://localhost:8080/api"

export interface User {
  id: number
  email: string
  name: string
  created_at: string
}

export interface AuthResponse {
  token: string
  user: User
}

export interface Group {
  id: number
  name: string
  description?: string
  created_by: number
  created_at: string
  members?: User[]
}

export interface ExpenseSplit {
  id: number
  expense_id: number
  user_id: number
  user_name: string
  amount: number
}

export interface Expense {
  id: number
  group_id: number
  description: string
  amount: number
  paid_by: number
  paid_by_name: string
  created_at: string
  splits: ExpenseSplit[]
}

export interface Settlement {
  from_user_id: number
  from_user_name: string
  to_user_id: number
  to_user_name: string
  amount: number
}

export interface Balance {
  user_id: number
  user_name: string
  balance: number
}

export interface SettlementResponse {
  settlements: Settlement[]
  balances: Balance[]
}

class ApiClient {
  private getAuthHeaders() {
    const token = localStorage.getItem("token")
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  }

  async register(email: string, name: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, password }),
    })
    if (!response.ok) throw new Error("Registration failed")
    return response.json()
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
    if (!response.ok) throw new Error("Login failed")
    return response.json()
  }

  async getGroups(): Promise<Group[]> {
    const response = await fetch(`${API_BASE_URL}/groups`, {
      headers: this.getAuthHeaders(),
    })
    if (!response.ok) throw new Error("Failed to fetch groups")
    return response.json()
  }

  async createGroup(name: string, description?: string): Promise<Group> {
    const response = await fetch(`${API_BASE_URL}/groups`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ name, description }),
    })
    if (!response.ok) throw new Error("Failed to create group")
    return response.json()
  }

  async getGroup(id: number): Promise<Group> {
    const response = await fetch(`${API_BASE_URL}/groups/${id}`, {
      headers: this.getAuthHeaders(),
    })
    if (!response.ok) throw new Error("Failed to fetch group")
    return response.json()
  }

  async addMemberToGroup(groupId: number, userId: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/groups/${groupId}/members`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ user_id: userId }),
    })
    if (!response.ok) throw new Error("Failed to add member")
  }

  async getExpenses(groupId: number): Promise<Expense[]> {
    const response = await fetch(`${API_BASE_URL}/expenses/group/${groupId}`, {
      headers: this.getAuthHeaders(),
    })
    if (!response.ok) throw new Error("Failed to fetch expenses")
    return response.json()
  }

  async createExpense(
    groupId: number,
    description: string,
    amount: number,
    paidBy: number,
    splitWith: number[],
  ): Promise<Expense> {
    const response = await fetch(`${API_BASE_URL}/expenses`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        group_id: groupId,
        description,
        amount,
        paid_by: paidBy,
        split_with: splitWith,
      }),
    })
    if (!response.ok) throw new Error("Failed to create expense")
    return response.json()
  }

  async getSettlements(groupId: number): Promise<SettlementResponse> {
    const response = await fetch(`${API_BASE_URL}/settlements/group/${groupId}`, {
      headers: this.getAuthHeaders(),
    })
    if (!response.ok) throw new Error("Failed to fetch settlements")
    return response.json()
  }
}

export const api = new ApiClient()
