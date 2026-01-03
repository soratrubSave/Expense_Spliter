"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { useRouter, useParams } from "next/navigation"
import { AuthGuard } from "@/components/auth-guard"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { api, type Group, type Expense, type User, type Balance, type Settlement } from "@/lib/api"

import { toast } from "sonner" 
import { ArrowLeft, Plus, Receipt, TrendingUp, TrendingDown } from "lucide-react"

export default function GroupDetailPage() {
  const router = useRouter()
  const params = useParams()
  // ❌ ลบอันเก่า: const { toast } = useToast()  <-- Sonner ไม่ต้องใช้บรรทัดนี้
  const groupId = Number(params.id)

  const [group, setGroup] = useState<Group | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [balances, setBalances] = useState<Balance[]>([])
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false)
  const [expenseDescription, setExpenseDescription] = useState("")
  const [expenseAmount, setExpenseAmount] = useState("")
  const [expensePaidBy, setExpensePaidBy] = useState("")
  const [expenseSplitWith, setExpenseSplitWith] = useState<number[]>([])
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) {
      setCurrentUser(JSON.parse(userData))
    }
    loadGroupData()
  }, [groupId])

  const loadGroupData = async () => {
    try {
      const [groupData, expensesData, settlementsData] = await Promise.all([
        api.getGroup(groupId),
        api.getExpenses(groupId),
        api.getSettlements(groupId),
      ])
      setGroup(groupData)
      setExpenses(expensesData)
      setBalances(settlementsData.balances)
      setSettlements(settlementsData.settlements)
    } catch (error) {
      // ✅ แก้เป็น toast.error ของ Sonner
      toast.error("Failed to load group data")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)

    try {
      await api.createExpense(
        groupId,
        expenseDescription,
        Number(expenseAmount),
        Number(expensePaidBy),
        expenseSplitWith,
      )
      
      // ✅ แก้เป็น toast.success ของ Sonner
      toast.success("Expense added successfully")

      setExpenseDialogOpen(false)
      setExpenseDescription("")
      setExpenseAmount("")
      setExpensePaidBy("")
      setExpenseSplitWith([])
      loadGroupData()
    } catch (error) {
       // ✅ แก้เป็น toast.error ของ Sonner
      toast.error("Failed to create expense")
    } finally {
      setCreating(false)
    }
  }

  const toggleSplitMember = (userId: number) => {
    setExpenseSplitWith((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]))
  }

  const splitAmount =
    expenseAmount && expenseSplitWith.length > 0 ? (Number(expenseAmount) / expenseSplitWith.length).toFixed(2) : "0.00"

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full mx-auto" />
            <p className="mt-4 text-muted-foreground">Loading group...</p>
          </div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-gradient-to-br from-background to-muted">
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-4 flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={() => router.push("/")}>
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex-1">
              <h1 className="text-xl font-semibold">{group?.name}</h1>
              <p className="text-sm text-muted-foreground">{group?.description}</p>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8 space-y-6">
          {/* Members Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Members</CardTitle>
                  <CardDescription>{group?.members?.length || 0} members</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap gap-4">
                {group?.members?.map((member) => (
                  <div key={member.id} className="flex items-center gap-2">
                    <Avatar>
                      <AvatarFallback>{member.name[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{member.name}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Settlements Section */}
          {settlements.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Settlements</CardTitle>
                <CardDescription>Who should pay whom</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {settlements.map((settlement, index) => (
                  <div key={index} className="flex items-center justify-between p-4 rounded-lg bg-muted">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>{settlement.from_user_name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{settlement.from_user_name}</p>
                        <p className="text-sm text-muted-foreground">owes {settlement.to_user_name}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-bold text-destructive">${settlement.amount.toFixed(2)}</p>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Balances Section */}
          {balances.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Balances</CardTitle>
                <CardDescription>Current balance for each member</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {balances.map((balance) => (
                  <div key={balance.user_id} className="flex items-center justify-between p-3 rounded-lg bg-muted">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback className="text-xs">{balance.user_name[0]}</AvatarFallback>
                      </Avatar>
                      <span className="font-medium">{balance.user_name}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {balance.balance > 0 ? (
                        <TrendingUp className="h-4 w-4 text-green-500" />
                      ) : balance.balance < 0 ? (
                        <TrendingDown className="h-4 w-4 text-red-500" />
                      ) : null}
                      <span
                        className={`font-bold ${
                          balance.balance > 0 ? "text-green-500" : balance.balance < 0 ? "text-red-500" : ""
                        }`}
                      >
                        ${Math.abs(balance.balance).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Expenses Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Expenses</CardTitle>
                  <CardDescription>{expenses.length} expenses</CardDescription>
                </div>
                <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
                  <DialogTrigger asChild>
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Expense
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md">
                    <DialogHeader>
                      <DialogTitle>Add Expense</DialogTitle>
                      <DialogDescription>Add a new expense to split with group members</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateExpense} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Input
                          id="description"
                          placeholder="Hotel"
                          value={expenseDescription}
                          onChange={(e) => setExpenseDescription(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="amount">Amount</Label>
                        <Input
                          id="amount"
                          type="number"
                          step="0.01"
                          placeholder="3000"
                          value={expenseAmount}
                          onChange={(e) => setExpenseAmount(e.target.value)}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="paidBy">Paid By</Label>
                        <Select value={expensePaidBy} onValueChange={setExpensePaidBy}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select member" />
                          </SelectTrigger>
                          <SelectContent>
                            {group?.members?.map((member) => (
                              <SelectItem key={member.id} value={member.id.toString()}>
                                {member.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Split With</Label>
                        <div className="space-y-2 max-h-40 overflow-y-auto">
                          {group?.members?.map((member) => (
                            <div key={member.id} className="flex items-center space-x-2">
                              <Checkbox
                                id={`member-${member.id}`}
                                checked={expenseSplitWith.includes(member.id)}
                                onCheckedChange={() => toggleSplitMember(member.id)}
                              />
                              <label
                                htmlFor={`member-${member.id}`}
                                className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                              >
                                {member.name}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                      {expenseSplitWith.length > 0 && (
                        <div className="p-3 bg-muted rounded-lg">
                          <p className="text-sm text-muted-foreground">
                            Split amount per person: <span className="font-bold text-foreground">${splitAmount}</span>
                          </p>
                        </div>
                      )}
                      <Button type="submit" className="w-full" disabled={creating || expenseSplitWith.length === 0}>
                        {creating ? "Adding..." : "Add Expense"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </CardHeader>
            <CardContent>
              {expenses.length === 0 ? (
                <div className="text-center py-8">
                  <Receipt className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No expenses yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {expenses.map((expense) => (
                    <div key={expense.id} className="flex items-center justify-between p-4 rounded-lg border">
                      <div className="flex-1">
                        <p className="font-medium">{expense.description}</p>
                        <p className="text-sm text-muted-foreground">Paid by {expense.paid_by_name}</p>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {expense.splits?.map((split) => (
                            <span key={split.id} className="text-xs px-2 py-1 bg-muted rounded">
                              {split.user_name}: ${split.amount.toFixed(2)}
                            </span>
                          ))}
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-lg font-bold">${expense.amount.toFixed(2)}</p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(expense.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </main>
      </div>
    </AuthGuard>
  )
}