const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api"

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

export interface PaymentConfirmation {
  id: number
  group_id: number
  from_user_id: number
  from_user_name: string
  to_user_id: number
  to_user_name: string
  amount: number
  slip_url?: string
  confirmed_by?: number
  confirmed_by_name?: string
  confirmed_at?: string
}

class ApiClient {
  private getAuthHeaders() {
    const token = localStorage.getItem("token")
    return {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    }
  }

  private async handleResponse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      // พยายามอ่าน Error Message ที่ Backend ส่งมา (เช่น { "error": "This email is already..." })
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || "An error occurred");
    }
    return response.json();
  }

  async register(email: string, name: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, password }),
    })
    return this.handleResponse<AuthResponse>(response);
  }

  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })
    return this.handleResponse<AuthResponse>(response);
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

  async updateGroup(id: number, name: string, description?: string): Promise<Group> {
    const response = await fetch(`${API_BASE_URL}/groups/${id}`, {
      method: "PUT",
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ name, description }),
    })
    if (!response.ok) throw new Error("Failed to update group")
    return response.json()
  }

  async deleteGroup(id: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/groups/${id}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    })
    if (!response.ok) throw new Error("Failed to delete group")
  }

  async searchUsers(groupId: number, query: string): Promise<User[]> {
    const response = await fetch(`${API_BASE_URL}/groups/${groupId}/search-users?q=${encodeURIComponent(query)}`, {
      headers: this.getAuthHeaders(),
    })
    if (!response.ok) throw new Error("Failed to search users")
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

  async updateExpense(
    expenseId: number,
    description: string,
    amount: number,
    paidBy: number,
    splitWith: number[],
  ): Promise<Expense> {
    const response = await fetch(`${API_BASE_URL}/expenses/${expenseId}`, {
      method: "PUT",
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        description,
        amount,
        paid_by: paidBy,
        split_with: splitWith,
      }),
    })
    if (!response.ok) throw new Error("Failed to update expense")
    return response.json()
  }

  async deleteExpense(expenseId: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/expenses/${expenseId}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    })
    if (!response.ok) throw new Error("Failed to delete expense")
  }

  async removeMemberToGroup(groupId: number, userId: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/groups/${groupId}/members/${userId}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    })
    if (!response.ok) throw new Error("Failed to remove member")
  }

  async getSettlements(groupId: number): Promise<SettlementResponse> {
    const response = await fetch(`${API_BASE_URL}/settlements/group/${groupId}`, {
      headers: this.getAuthHeaders(),
    })
    if (!response.ok) throw new Error("Failed to fetch settlements")
    return response.json()
  }

  async uploadSlip(file: File): Promise<{ slip_url: string }> {
    const formData = new FormData()
    formData.append("slip", file)

    const response = await fetch(`${API_BASE_URL}/payments/upload-slip`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${localStorage.getItem("token")}`,
      },
      body: formData,
    })
    if (!response.ok) throw new Error("Failed to upload slip")
    return response.json()
  }

  async createPaymentConfirmation(
    groupId: number,
    toUserId: number,
    amount: number,
    slipUrl: string,
  ): Promise<PaymentConfirmation> {
    const response = await fetch(`${API_BASE_URL}/payments/confirmations`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify({
        group_id: groupId,
        to_user_id: toUserId,
        amount,
        slip_url: slipUrl,
      }),
    })
    if (!response.ok) throw new Error("Failed to create payment confirmation")
    return response.json()
  }

  async getPaymentConfirmations(groupId: number): Promise<PaymentConfirmation[]> {
    const response = await fetch(`${API_BASE_URL}/payments/confirmations/group/${groupId}`, {
      headers: this.getAuthHeaders(),
    })
    if (!response.ok) throw new Error("Failed to fetch payment confirmations")
    return response.json()
  }

  async confirmPayment(confirmationId: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/payments/confirmations/${confirmationId}/confirm`, {
      method: "PUT",
      headers: this.getAuthHeaders(),
    })
    if (!response.ok) throw new Error("Failed to confirm payment")
  }

  async getFriends(): Promise<User[]> {
    const response = await fetch(`${API_BASE_URL}/friends`, {
      headers: this.getAuthHeaders(),
    })
    if (!response.ok) throw new Error("Failed to fetch friends")
    return response.json()
  }

  async addFriend(friendId: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/friends`, {
      method: "POST",
      headers: this.getAuthHeaders(),
      body: JSON.stringify({ friend_id: friendId }),
    })
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || "Failed to add friend")
    }
  }

  async removeFriend(friendId: number): Promise<void> {
    const response = await fetch(`${API_BASE_URL}/friends/${friendId}`, {
      method: "DELETE",
      headers: this.getAuthHeaders(),
    })
    if (!response.ok) throw new Error("Failed to remove friend")
  }

  async searchFriends(query: string): Promise<User[]> {
    const response = await fetch(`${API_BASE_URL}/friends/search?q=${encodeURIComponent(query)}`, {
      headers: this.getAuthHeaders(),
    })
    if (!response.ok) throw new Error("Failed to search friends")
    return response.json()
  }
}

export const api = new ApiClient()
