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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Checkbox } from "@/components/ui/checkbox"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { api, type Group, type Expense, type User, type Balance, type Settlement, type PaymentConfirmation } from "@/lib/api"

import { toast } from "sonner" 
import { ArrowLeft, Plus, Receipt, TrendingUp, TrendingDown, Edit, Trash2, MoreVertical, Search } from "lucide-react"

export default function GroupDetailPage() {
  const router = useRouter()
  const params = useParams()
  // ❌ ลบอันเก่า: const { toast } = useToast()  <-- Sonner ไม่ต้องใช้บรรทัดนี้
  const groupId = Number(params.id)

  const [group, setGroup] = useState<Group | null>(null)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [balances, setBalances] = useState<Balance[]>([])
  const [settlements, setSettlements] = useState<Settlement[]>([])
  const [paymentConfirmations, setPaymentConfirmations] = useState<PaymentConfirmation[]>([])
  const [loading, setLoading] = useState(true)
  const [currentUser, setCurrentUser] = useState<User | null>(null)

  const [expenseDialogOpen, setExpenseDialogOpen] = useState(false)
  const [expenseDescription, setExpenseDescription] = useState("")
  const [expenseAmount, setExpenseAmount] = useState("")
  const [expensePaidBy, setExpensePaidBy] = useState("")
  const [expenseSplitWith, setExpenseSplitWith] = useState<number[]>([])
  const [creating, setCreating] = useState(false)

  const [editGroupDialogOpen, setEditGroupDialogOpen] = useState(false)
  const [editGroupName, setEditGroupName] = useState("")
  const [editGroupDescription, setEditGroupDescription] = useState("")
  const [updatingGroup, setUpdatingGroup] = useState(false)

  const [editExpenseDialogOpen, setEditExpenseDialogOpen] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [editExpenseDescription, setEditExpenseDescription] = useState("")
  const [editExpenseAmount, setEditExpenseAmount] = useState("")
  const [editExpensePaidBy, setEditExpensePaidBy] = useState("")
  const [editExpenseSplitWith, setEditExpenseSplitWith] = useState<number[]>([])
  const [updatingExpense, setUpdatingExpense] = useState(false)

  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [searching, setSearching] = useState(false)

  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [selectedSettlement, setSelectedSettlement] = useState<Settlement | null>(null)
  const [slipFile, setSlipFile] = useState<File | null>(null)
  const [uploadingSlip, setUploadingSlip] = useState(false)
  const [creatingPayment, setCreatingPayment] = useState(false)

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) {
      setCurrentUser(JSON.parse(userData))
    }
    loadGroupData()
  }, [groupId])

  const loadGroupData = async () => {
    try {
      const [groupData, expensesData, settlementsData, paymentConfirmationsData] = await Promise.all([
        api.getGroup(groupId),
        api.getExpenses(groupId),
        api.getSettlements(groupId),
        api.getPaymentConfirmations(groupId),
      ])
      setGroup(groupData)
      setExpenses(expensesData)
      setBalances(settlementsData.balances)
      setSettlements(settlementsData.settlements)
      setPaymentConfirmations(paymentConfirmationsData || [])
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

  const handleEditGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    setUpdatingGroup(true)

    try {
      const updatedGroup = await api.updateGroup(groupId, editGroupName, editGroupDescription)
      setGroup(updatedGroup)
      toast.success("Group updated successfully")
      setEditGroupDialogOpen(false)
    } catch (error) {
      toast.error("Failed to update group")
    } finally {
      setUpdatingGroup(false)
    }
  }

  const handleDeleteGroup = async () => {
    try {
      await api.deleteGroup(groupId)
      toast.success("Group deleted successfully")
      router.push("/")
    } catch (error) {
      toast.error("Failed to delete group")
    }
  }

  const openEditGroupDialog = () => {
    if (group) {
      setEditGroupName(group.name)
      setEditGroupDescription(group.description || "")
      setEditGroupDialogOpen(true)
    }
  }

  const openEditExpenseDialog = (expense: Expense) => {
    setEditingExpense(expense)
    setEditExpenseDescription(expense.description)
    setEditExpenseAmount(expense.amount.toString())
    setEditExpensePaidBy(expense.paid_by.toString())
    setEditExpenseSplitWith(expense.splits?.map(split => split.user_id) || [])
    setEditExpenseDialogOpen(true)
  }

  const handleEditExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingExpense) return

    setUpdatingExpense(true)

    try {
      await api.updateExpense(
        editingExpense.id,
        editExpenseDescription,
        Number(editExpenseAmount),
        Number(editExpensePaidBy),
        editExpenseSplitWith,
      )
      
      toast.success("Expense updated successfully")
      setEditExpenseDialogOpen(false)
      setEditingExpense(null)
      loadGroupData()
    } catch (error) {
      toast.error("Failed to update expense")
    } finally {
      setUpdatingExpense(false)
    }
  }

  const handleDeleteExpense = async (expenseId: number) => {
    try {
      await api.deleteExpense(expenseId)
      toast.success("Expense deleted successfully")
      loadGroupData()
    } catch (error) {
      toast.error("Failed to delete expense")
    }
  }

  const handleSearchUsers = async (query: string) => {
    setSearchQuery(query)
    if (query.length < 2) {
      setSearchResults([])
      return
    }

    setSearching(true)
    try {
      const results = await api.searchUsers(groupId, query)
      setSearchResults(results)
    } catch (error) {
      toast.error("Failed to search users")
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const handleAddMember = async (userId: number, userName: string) => {
    try {
      await api.addMemberToGroup(groupId, userId)
      toast.success(`${userName} added to group successfully`)
      setSearchQuery("")
      setSearchResults([])
      loadGroupData()
    } catch (error) {
      toast.error("Failed to add member")
    }
  }

  const handleCreatePaymentConfirmation = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSettlement || !slipFile) return

    setCreatingPayment(true)
    try {
      // Upload slip first
      const uploadResult = await api.uploadSlip(slipFile)
      
      // Create payment confirmation
      await api.createPaymentConfirmation(
        groupId,
        selectedSettlement.to_user_id,
        selectedSettlement.amount,
        uploadResult.slip_url,
      )

      toast.success("Payment slip submitted successfully")
      setPaymentDialogOpen(false)
      setSelectedSettlement(null)
      setSlipFile(null)
      loadGroupData()
    } catch (error) {
      toast.error("Failed to create payment confirmation")
    } finally {
      setCreatingPayment(false)
    }
  }

  const handleConfirmPayment = async (confirmationId: number) => {
    try {
      await api.confirmPayment(confirmationId)
      toast.success("Payment confirmed successfully")
      loadGroupData()
    } catch (error) {
      toast.error("Failed to confirm payment")
    }
  }

  const openPaymentDialog = (settlement: Settlement) => {
    setSelectedSettlement(settlement)
    setPaymentDialogOpen(true)
  }

  const toggleEditSplitMember = (userId: number) => {
    setEditExpenseSplitWith((prev) => (prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]))
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
            {group?.created_by === currentUser?.id && (
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="icon" onClick={openEditGroupDialog}>
                  <Edit className="h-4 w-4" />
                </Button>
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Group</AlertDialogTitle>
                      <AlertDialogDescription>
                        Are you sure you want to delete this group? This action cannot be undone and will delete all expenses and data associated with this group.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteGroup} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                        Delete Group
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
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
            <CardContent className="space-y-4">
              {/* Search Users */}
              <div className="space-y-2">
                <Label htmlFor="search-users">Add Members</Label>
                <Input
                  id="search-users"
                  placeholder="Search by email or name..."
                  value={searchQuery}
                  onChange={(e) => handleSearchUsers(e.target.value)}
                />
                {searching && (
                  <p className="text-sm text-muted-foreground">Searching...</p>
                )}
                {searchResults.length > 0 && (
                  <div className="border rounded-lg p-2 space-y-2 max-h-40 overflow-y-auto">
                    {searchResults.map((user) => (
                      <div key={user.id} className="flex items-center justify-between p-2 rounded hover:bg-muted">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarFallback className="text-xs">{user.name[0]}</AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="text-sm font-medium">{user.name}</p>
                            <p className="text-xs text-muted-foreground">{user.email}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handleAddMember(user.id, user.name)}
                        >
                          Add
                        </Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Current Members */}
              <div>
                <Label className="text-sm font-medium">Current Members</Label>
                <div className="flex flex-wrap gap-4 mt-2">
                {group?.members?.map((member) => (
                  <div key={member.id} className="flex items-center gap-2 p-2 rounded-lg border">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback className="text-xs">{member.name[0]}</AvatarFallback>
                    </Avatar>
                    <span className="text-sm font-medium">{member.name}</span>
                    {group?.created_by === currentUser?.id && member.id !== currentUser?.id && (
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-6 w-6 p-0 text-destructive hover:text-destructive ml-2"
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Member</AlertDialogTitle>
                            <AlertDialogDescription>
                              Are you sure you want to remove {member.name} from this group?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={async () => {
                                try {
                                  await api.removeMemberToGroup(groupId, member.id)
                                  toast.success("Member removed successfully")
                                  loadGroupData()
                                } catch (error) {
                                  toast.error("Failed to remove member")
                                }
                              }}
                              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            >
                              Remove Member
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
                    )}
                  </div>
                ))}
              </div>
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
                    <div className="flex items-center gap-3">
                      <p className="text-lg font-bold text-destructive">${settlement.amount.toFixed(2)}</p>
                      {settlement.from_user_id === currentUser?.id && (
                        <Button size="sm" onClick={() => openPaymentDialog(settlement)}>
                          Pay
                        </Button>
                      )}
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

          {/* Payment Confirmations Section */}
          {paymentConfirmations?.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Payment Confirmations</CardTitle>
                <CardDescription>Pending payment confirmations</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {paymentConfirmations.map((confirmation) => (
                  <div key={confirmation.id} className="flex items-center justify-between p-4 rounded-lg bg-muted">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>{confirmation.from_user_name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">{confirmation.from_user_name} → {confirmation.to_user_name}</p>
                        <p className="text-sm text-muted-foreground">${confirmation.amount.toFixed(2)}</p>
                        {confirmation.slip_url && (
                          <a
                            href={confirmation.slip_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-500 hover:underline"
                          >
                            View Slip
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {confirmation.confirmed_by ? (
                        <div className="text-right">
                          <p className="text-sm font-medium text-green-600">Confirmed</p>
                          <p className="text-xs text-muted-foreground">by {confirmation.confirmed_by_name}</p>
                        </div>
                      ) : confirmation.to_user_id === currentUser?.id ? (
                        <Button size="sm" onClick={() => handleConfirmPayment(confirmation.id)}>
                          Confirm
                        </Button>
                      ) : (
                        <span className="text-sm text-muted-foreground">Pending</span>
                      )}
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
                      <div className="flex items-center gap-2 ml-4">
                        <div className="text-right">
                          <p className="text-lg font-bold">${expense.amount.toFixed(2)}</p>
                          <p className="text-xs text-muted-foreground">
                            {new Date(expense.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="flex flex-col gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditExpenseDialog(expense)}
                            className="h-8 w-8 p-0"
                          >
                            <Edit className="h-3 w-3" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Expense</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Are you sure you want to delete this expense? This action cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteExpense(expense.id)}
                                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                >
                                  Delete Expense
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Edit Group Dialog */}
          <Dialog open={editGroupDialogOpen} onOpenChange={setEditGroupDialogOpen}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Edit Group</DialogTitle>
                <DialogDescription>Update group information</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleEditGroup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-name">Group Name</Label>
                  <Input
                    id="edit-name"
                    placeholder="Chiang Mai Trip"
                    value={editGroupName}
                    onChange={(e) => setEditGroupName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description (Optional)</Label>
                  <Input
                    id="edit-description"
                    placeholder="3 days trip"
                    value={editGroupDescription}
                    onChange={(e) => setEditGroupDescription(e.target.value)}
                  />
                </div>
                <Button type="submit" className="w-full" disabled={updatingGroup}>
                  {updatingGroup ? "Updating..." : "Update Group"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          {/* Edit Expense Dialog */}
          <Dialog open={editExpenseDialogOpen} onOpenChange={setEditExpenseDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Expense</DialogTitle>
                <DialogDescription>Update expense information</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleEditExpense} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="edit-description">Description</Label>
                  <Input
                    id="edit-description"
                    placeholder="Hotel"
                    value={editExpenseDescription}
                    onChange={(e) => setEditExpenseDescription(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-amount">Amount</Label>
                  <Input
                    id="edit-amount"
                    type="number"
                    step="0.01"
                    placeholder="3000"
                    value={editExpenseAmount}
                    onChange={(e) => setEditExpenseAmount(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="edit-paidBy">Paid By</Label>
                  <Select value={editExpensePaidBy} onValueChange={setEditExpensePaidBy}>
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
                          id={`edit-member-${member.id}`}
                          checked={editExpenseSplitWith.includes(member.id)}
                          onCheckedChange={() => toggleEditSplitMember(member.id)}
                        />
                        <label
                          htmlFor={`edit-member-${member.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                        >
                          {member.name}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
                {editExpenseSplitWith.length > 0 && (
                  <div className="p-3 bg-muted rounded-lg">
                    <p className="text-sm text-muted-foreground">
                      Split amount per person: <span className="font-bold text-foreground">
                        ${(Number(editExpenseAmount) / editExpenseSplitWith.length).toFixed(2)}
                      </span>
                    </p>
                  </div>
                )}
                <Button type="submit" className="w-full" disabled={updatingExpense || editExpenseSplitWith.length === 0}>
                  {updatingExpense ? "Updating..." : "Update Expense"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>

          {/* Payment Dialog */}
          <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Upload Payment Slip</DialogTitle>
                <DialogDescription>
                  Upload a slip for your payment of ${selectedSettlement?.amount.toFixed(2)} to {selectedSettlement?.to_user_name}
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreatePaymentConfirmation} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="slip">Payment Slip</Label>
                  <Input
                    id="slip"
                    type="file"
                    accept="image/*"
                    onChange={(e) => setSlipFile(e.target.files?.[0] || null)}
                    required
                  />
                </div>
                <Button type="submit" className="w-full" disabled={creatingPayment || !slipFile}>
                  {creatingPayment ? "Creating..." : "Upload & Submit"}
                </Button>
              </form>
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </AuthGuard>
  )
}