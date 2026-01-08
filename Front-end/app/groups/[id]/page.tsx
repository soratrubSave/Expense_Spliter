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
import { Separator } from "@/components/ui/separator"
import { Badge } from "@/components/ui/badge"

import { toast } from "sonner" 
import { ArrowLeft, Plus, Receipt, Edit, Trash2, Search, Wallet, Users, FileText, CheckCircle2, Clock, History } from "lucide-react"

export default function GroupDetailPage() {
  const router = useRouter()
  const params = useParams()
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
      toast.error("Failed to load group data")
    } finally {
      setLoading(false)
    }
  }

  // ... (ฟังก์ชัน Handler ต่างๆ เหมือนเดิม) ...
  const handleCreateExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      await api.createExpense(groupId, expenseDescription, Number(expenseAmount), Number(expensePaidBy), expenseSplitWith)
      toast.success("Expense added successfully")
      setExpenseDialogOpen(false)
      setExpenseDescription("")
      setExpenseAmount("")
      setExpensePaidBy("")
      setExpenseSplitWith([])
      loadGroupData()
    } catch (error) {
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
      await api.updateExpense(editingExpense.id, editExpenseDescription, Number(editExpenseAmount), Number(editExpensePaidBy), editExpenseSplitWith)
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
      const uploadResult = await api.uploadSlip(slipFile)
      await api.createPaymentConfirmation(groupId, selectedSettlement.to_user_id, selectedSettlement.amount, uploadResult.slip_url)
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

  const splitAmount = expenseAmount && expenseSplitWith.length > 0 ? (Number(expenseAmount) / expenseSplitWith.length).toFixed(2) : "0.00"

  // ✅ แยกรายการที่รออนุมัติ (Pending) และ ยืนยันแล้ว (Confirmed) ออกจากกัน
  const pendingPayments = paymentConfirmations.filter(p => !p.confirmed_by)
  const confirmedPayments = paymentConfirmations.filter(p => p.confirmed_by)

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <div className="animate-spin h-8 w-8 border-4 border-slate-200 border-t-slate-800 rounded-full" />
            <p className="text-slate-500 font-medium animate-pulse">Loading...</p>
          </div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pb-20">
        
        {/* Header */}
        <header className="sticky top-0 z-20 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border-b border-slate-200 dark:border-slate-800">
          <div className="container mx-auto px-4 h-16 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => router.push("/")} className="hover:bg-slate-100 dark:hover:bg-slate-800 rounded-full">
                <ArrowLeft className="h-5 w-5 text-slate-600 dark:text-slate-400" />
              </Button>
              <div className="flex flex-col">
                <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">{group?.name}</h1>
                <p className="text-xs text-slate-500 hidden sm:block">Expense Group</p>
              </div>
            </div>
            
            {group?.created_by === currentUser?.id && (
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="sm" onClick={openEditGroupDialog} className="text-slate-600">
                  Settings
                </Button>
                <Separator orientation="vertical" className="h-6 mx-1" />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>Delete Group</AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete the group and all its data.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                      <AlertDialogAction onClick={handleDeleteGroup} className="bg-red-600 hover:bg-red-700 text-white">
                        Delete
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            )}
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            
            {/* Left Sidebar */}
            <div className="lg:col-span-4 space-y-6">
              
              {/* Balances Summary */}
              <Card className="rounded-xl border-slate-200 shadow-sm overflow-hidden bg-white dark:bg-slate-900">
                <CardHeader className="bg-slate-50/50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-800 pb-4">
                  <div className="flex items-center gap-2">
                    <Wallet className="h-4 w-4 text-slate-500" />
                    <CardTitle className="text-base font-semibold">Your Balance</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  {balances.length > 0 ? (
                    <div className="space-y-4">
                      {balances.map((balance) => (
                        <div key={balance.user_id} className="flex items-center justify-between group">
                          <div className="flex items-center gap-3">
                            <Avatar className="h-9 w-9 border border-slate-200">
                              <AvatarFallback className="text-xs bg-slate-100 text-slate-600">
                                {balance.user_name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <span className={`text-sm font-medium ${currentUser?.id === balance.user_id ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                              {balance.user_name} {currentUser?.id === balance.user_id && "(You)"}
                            </span>
                          </div>
                          <div className="text-right">
                             <span
                              className={`font-semibold text-sm px-2.5 py-1 rounded-full ${
                                balance.balance > 0 
                                  ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400" 
                                  : balance.balance < 0 
                                  ? "bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400" 
                                  : "bg-slate-100 text-slate-500"
                              }`}
                            >
                              {balance.balance > 0 ? "+" : ""}{balance.balance.toFixed(2)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-6 text-slate-400 text-sm">No balances yet</div>
                  )}
                </CardContent>
              </Card>

               {/* Settlements */}
               {settlements.length > 0 && (
                <Card className="rounded-xl border-slate-200 shadow-sm bg-white dark:bg-slate-900">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Clock className="h-4 w-4 text-slate-500" />
                      Settlements
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {settlements.map((settlement, index) => (
                      <div key={index} className="flex flex-col p-3 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
                        <div className="flex justify-between items-center mb-2">
                          <div className="text-xs text-slate-500">
                            <span className="font-medium text-slate-700 dark:text-slate-300">{settlement.from_user_name}</span> owes <span className="font-medium text-slate-700 dark:text-slate-300">{settlement.to_user_name}</span>
                          </div>
                          <span className="font-bold text-rose-500 text-sm">${settlement.amount.toFixed(2)}</span>
                        </div>
                        {settlement.from_user_id === currentUser?.id && (
                          <Button size="sm" variant="outline" className="w-full text-xs h-8" onClick={() => openPaymentDialog(settlement)}>
                            Settle Up
                          </Button>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              )}

              {/* Members */}
              <Card className="rounded-xl border-slate-200 shadow-sm bg-white dark:bg-slate-900">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base font-semibold flex items-center gap-2">
                      <Users className="h-4 w-4 text-slate-500" />
                      Members
                    </CardTitle>
                    <Badge variant="secondary" className="bg-slate-100 text-slate-600">{group?.members?.length || 0}</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                    <Input
                      placeholder="Add people by name..."
                      value={searchQuery}
                      onChange={(e) => handleSearchUsers(e.target.value)}
                      className="pl-9 h-9 text-sm bg-slate-50 border-slate-200 focus:bg-white transition-all"
                    />
                    {searchResults.length > 0 && (
                      <div className="absolute top-10 left-0 right-0 z-10 bg-white border border-slate-200 rounded-lg shadow-lg max-h-48 overflow-y-auto p-1">
                        {searchResults.map((user) => (
                          <div key={user.id} className="flex items-center justify-between p-2 rounded hover:bg-slate-50 cursor-pointer" onClick={() => handleAddMember(user.id, user.name)}>
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarFallback className="text-[10px]">{user.name[0]}</AvatarFallback>
                              </Avatar>
                              <span className="text-sm font-medium">{user.name}</span>
                            </div>
                            <Plus className="h-4 w-4 text-slate-400" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    {group?.members?.map((member) => (
                      <Badge key={member.id} variant="outline" className="pl-1 pr-2 py-1 h-auto gap-2 text-sm font-normal border-slate-200 bg-white hover:bg-slate-50 text-slate-700">
                        <Avatar className="h-5 w-5">
                          <AvatarFallback className="text-[9px] bg-slate-200">{member.name[0]}</AvatarFallback>
                        </Avatar>
                        {member.name}
                        {group?.created_by === currentUser?.id && member.id !== currentUser?.id && (
                           <AlertDialog>
                           <AlertDialogTrigger asChild>
                             <span className="ml-1 text-slate-400 hover:text-red-500 cursor-pointer">×</span>
                           </AlertDialogTrigger>
                           <AlertDialogContent>
                             <AlertDialogHeader>
                               <AlertDialogTitle>Remove Member</AlertDialogTitle>
                               <AlertDialogDescription>Remove {member.name} from the group?</AlertDialogDescription>
                             </AlertDialogHeader>
                             <AlertDialogFooter>
                               <AlertDialogCancel>Cancel</AlertDialogCancel>
                               <AlertDialogAction onClick={() => {
                                  api.removeMemberToGroup(groupId, member.id).then(() => {
                                    toast.success("Member removed")
                                    loadGroupData()
                                  }).catch(() => toast.error("Failed"))
                               }} className="bg-red-600">Remove</AlertDialogAction>
                             </AlertDialogFooter>
                           </AlertDialogContent>
                         </AlertDialog>
                        )}
                      </Badge>
                    ))}
                  </div>
                </CardContent>
              </Card>

            </div>

            {/* Right Main Content */}
            <div className="lg:col-span-8 space-y-6">
              
              {/* ✅ ส่วนรายการที่ "รออนุมัติ" (สีส้ม/เหลือง) */}
              {pendingPayments.length > 0 && (
                <div className="space-y-3">
                   <h3 className="text-sm font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider pl-1 flex items-center gap-2">
                     <Clock className="h-4 w-4" />
                     Pending Approvals
                   </h3>
                  {pendingPayments.map((confirmation) => (
                    <div key={confirmation.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-900 gap-4">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-amber-100 flex items-center justify-center text-amber-600 shrink-0">
                          <FileText className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 dark:text-slate-100">
                            {confirmation.from_user_name} sent payment
                          </p>
                          <p className="text-sm text-slate-500">
                            ${confirmation.amount.toFixed(2)} to {confirmation.to_user_name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {confirmation.slip_url && (
                          <Button variant="outline" size="sm" asChild className="bg-white hover:bg-amber-50 border-amber-200 text-amber-800">
                            <a href={confirmation.slip_url} target="_blank" rel="noopener noreferrer">View Slip</a>
                          </Button>
                        )}
                        {confirmation.to_user_id === currentUser?.id && (
                          <Button size="sm" onClick={() => handleConfirmPayment(confirmation.id)} className="bg-amber-600 hover:bg-amber-700 text-white border-0">
                            Confirm
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* ✅ ส่วนรายการที่ "ยืนยันแล้ว" (สีเขียว/Clean) */}
              {confirmedPayments.length > 0 && (
                <div className="space-y-3">
                   <h3 className="text-sm font-medium text-slate-500 uppercase tracking-wider pl-1 flex items-center gap-2">
                     <History className="h-4 w-4" />
                     Payment History
                   </h3>
                  {confirmedPayments.map((confirmation) => (
                    <div key={confirmation.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl border border-emerald-100 bg-emerald-50/50 dark:bg-emerald-950/10 dark:border-emerald-900/50 gap-4 opacity-75 hover:opacity-100 transition-opacity">
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                          <CheckCircle2 className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-800 dark:text-slate-200">
                            Payment Confirmed
                          </p>
                          <p className="text-sm text-slate-500">
                            {confirmation.from_user_name} paid ${confirmation.amount.toFixed(2)} to {confirmation.to_user_name}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        {confirmation.slip_url && (
                          <Button variant="ghost" size="sm" asChild className="text-slate-400 hover:text-slate-600">
                            <a href={confirmation.slip_url} target="_blank" rel="noopener noreferrer">Slip</a>
                          </Button>
                        )}
                        <Badge variant="outline" className="text-emerald-600 border-emerald-200 bg-emerald-50 dark:bg-transparent dark:text-emerald-400">
                          Confirmed
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Expenses Header & List */}
              <div className="flex items-center justify-between pt-4">
                <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                  <Receipt className="h-6 w-6 text-slate-400" />
                  Expenses
                </h2>
                <Dialog open={expenseDialogOpen} onOpenChange={setExpenseDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="rounded-lg bg-slate-900 text-white hover:bg-slate-800 shadow-lg shadow-slate-900/20">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Expense
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-md rounded-xl">
                    <DialogHeader>
                      <DialogTitle>Add New Expense</DialogTitle>
                      <DialogDescription>Enter details of the expense.</DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleCreateExpense} className="space-y-4 pt-4">
                      <div className="space-y-2">
                        <Label>Description</Label>
                        <Input
                          placeholder="e.g. Dinner at Somtam Nua"
                          value={expenseDescription}
                          onChange={(e) => setExpenseDescription(e.target.value)}
                          required
                          className="rounded-lg"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label>Amount</Label>
                        <div className="relative">
                          <span className="absolute left-3 top-2.5 text-slate-500">$</span>
                          <Input
                            type="number"
                            step="0.01"
                            placeholder="0.00"
                            value={expenseAmount}
                            onChange={(e) => setExpenseAmount(e.target.value)}
                            required
                            className="pl-7 rounded-lg"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label>Paid By</Label>
                        <Select value={expensePaidBy} onValueChange={setExpensePaidBy}>
                          <SelectTrigger className="rounded-lg">
                            <SelectValue placeholder="Who paid?" />
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
                        <Label className="mb-2 block">Split With</Label>
                        <div className="space-y-1 max-h-40 overflow-y-auto border rounded-lg p-2 bg-slate-50">
                          {group?.members?.map((member) => (
                            <div key={member.id} className="flex items-center p-2 rounded hover:bg-white hover:shadow-sm transition-all">
                              <Checkbox
                                id={`member-${member.id}`}
                                checked={expenseSplitWith.includes(member.id)}
                                onCheckedChange={() => toggleSplitMember(member.id)}
                                className="mr-3"
                              />
                              <label htmlFor={`member-${member.id}`} className="flex-1 text-sm cursor-pointer select-none font-medium text-slate-700">
                                {member.name}
                              </label>
                            </div>
                          ))}
                        </div>
                      </div>
                      {expenseSplitWith.length > 0 && (
                        <div className="p-3 bg-slate-100 rounded-lg flex justify-between items-center text-sm text-slate-600">
                          <span>Per person:</span>
                          <span className="font-bold text-slate-900">${splitAmount}</span>
                        </div>
                      )}
                      <Button type="submit" className="w-full rounded-lg bg-slate-900" disabled={creating || expenseSplitWith.length === 0}>
                        {creating ? "Saving..." : "Save Expense"}
                      </Button>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>

              {expenses.length === 0 ? (
                <Card className="rounded-xl border-dashed border-2 border-slate-200 bg-slate-50/50 py-12 text-center">
                  <div className="flex flex-col items-center">
                    <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-100">
                      <Receipt className="h-8 w-8 text-slate-300" />
                    </div>
                    <h3 className="text-lg font-medium text-slate-900">No expenses yet</h3>
                    <p className="text-slate-500 max-w-sm mt-1">Start adding expenses to track who owes what.</p>
                  </div>
                </Card>
              ) : (
                <div className="space-y-4">
                  {expenses.map((expense) => (
                    <Card key={expense.id} className="rounded-xl border-slate-200 shadow-sm hover:shadow-md transition-shadow group">
                      <CardContent className="p-5">
                        <div className="flex justify-between items-start">
                          <div className="flex items-start gap-4">
                            <div className="h-12 w-12 rounded-xl bg-slate-100 dark:bg-slate-800 flex flex-col items-center justify-center min-w-[3rem]">
                              <span className="text-xs font-bold text-slate-500 uppercase">
                                {new Date(expense.created_at).toLocaleString('default', { month: 'short' })}
                              </span>
                              <span className="text-lg font-bold text-slate-800 dark:text-slate-200 leading-none">
                                {new Date(expense.created_at).getDate()}
                              </span>
                            </div>
                            <div>
                              <h3 className="font-semibold text-lg text-slate-900 dark:text-slate-100">{expense.description}</h3>
                              <p className="text-sm text-slate-500">
                                Paid by <span className="font-medium text-slate-700">{expense.paid_by_name}</span>
                              </p>
                              
                              <div className="mt-3 flex flex-wrap gap-2">
                                {expense.splits?.slice(0, 3).map((split) => (
                                  <Badge key={split.id} variant="secondary" className="bg-slate-50 text-slate-600 font-normal text-xs border border-slate-100">
                                    {split.user_name}: ${split.amount.toFixed(2)}
                                  </Badge>
                                ))}
                                {(expense.splits?.length || 0) > 3 && (
                                  <Badge variant="secondary" className="bg-slate-50 text-slate-500 text-xs">+{ (expense.splits?.length || 0) - 3 } more</Badge>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                             <div className="text-xl font-bold text-slate-900 dark:text-white">
                               ${expense.amount.toFixed(2)}
                             </div>
                             <div className="flex items-center justify-end gap-1 mt-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                <Button variant="ghost" size="icon" onClick={() => openEditExpenseDialog(expense)} className="h-8 w-8 text-slate-400 hover:text-slate-700">
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <AlertDialog>
                                  <AlertDialogTrigger asChild>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-500">
                                      <Trash2 className="h-4 w-4" />
                                    </Button>
                                  </AlertDialogTrigger>
                                  <AlertDialogContent>
                                    <AlertDialogHeader>
                                      <AlertDialogTitle>Delete Expense?</AlertDialogTitle>
                                      <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
                                    </AlertDialogHeader>
                                    <AlertDialogFooter>
                                      <AlertDialogCancel>Cancel</AlertDialogCancel>
                                      <AlertDialogAction onClick={() => handleDeleteExpense(expense.id)} className="bg-destructive">Delete</AlertDialogAction>
                                    </AlertDialogFooter>
                                  </AlertDialogContent>
                                </AlertDialog>
                             </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </div>

          <Dialog open={editGroupDialogOpen} onOpenChange={setEditGroupDialogOpen}>
            <DialogContent className="rounded-xl">
              <DialogHeader>
                <DialogTitle>Edit Group</DialogTitle>
                <DialogDescription>Update group information</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleEditGroup} className="space-y-4">
                <div className="space-y-2">
                  <Label>Group Name</Label>
                  <Input value={editGroupName} onChange={(e) => setEditGroupName(e.target.value)} required className="rounded-lg" />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input value={editGroupDescription} onChange={(e) => setEditGroupDescription(e.target.value)} className="rounded-lg" />
                </div>
                <Button type="submit" className="w-full bg-slate-900 rounded-lg" disabled={updatingGroup}>Update Group</Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={editExpenseDialogOpen} onOpenChange={setEditExpenseDialogOpen}>
            <DialogContent className="rounded-xl max-w-md">
              <DialogHeader>
                <DialogTitle>Edit Expense</DialogTitle>
              </DialogHeader>
              <form onSubmit={handleEditExpense} className="space-y-4">
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input value={editExpenseDescription} onChange={(e) => setEditExpenseDescription(e.target.value)} required className="rounded-lg" />
                </div>
                <div className="space-y-2">
                  <Label>Amount</Label>
                  <Input type="number" step="0.01" value={editExpenseAmount} onChange={(e) => setEditExpenseAmount(e.target.value)} required className="rounded-lg" />
                </div>
                 <div className="space-y-2">
                  <Label>Paid By</Label>
                  <Select value={editExpensePaidBy} onValueChange={setEditExpensePaidBy}>
                    <SelectTrigger className="rounded-lg"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {group?.members?.map(m => <SelectItem key={m.id} value={m.id.toString()}>{m.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                 <div className="space-y-2">
                  <Label>Split With</Label>
                  <div className="space-y-1 max-h-40 overflow-y-auto border rounded-lg p-2 bg-slate-50">
                    {group?.members?.map((member) => (
                      <div key={member.id} className="flex items-center p-2 rounded hover:bg-white">
                        <Checkbox id={`edit-member-${member.id}`} checked={editExpenseSplitWith.includes(member.id)} onCheckedChange={() => toggleEditSplitMember(member.id)} className="mr-3" />
                        <label htmlFor={`edit-member-${member.id}`} className="text-sm cursor-pointer">{member.name}</label>
                      </div>
                    ))}
                  </div>
                </div>
                <Button type="submit" className="w-full bg-slate-900 rounded-lg" disabled={updatingExpense}>Update Expense</Button>
              </form>
            </DialogContent>
          </Dialog>

          <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
            <DialogContent className="rounded-xl max-w-md">
              <DialogHeader>
                <DialogTitle>Upload Payment Slip</DialogTitle>
                <DialogDescription>Amount: ${selectedSettlement?.amount.toFixed(2)}</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreatePaymentConfirmation} className="space-y-4">
                <div className="space-y-2">
                  <Label>Slip Image</Label>
                  <Input type="file" accept="image/*" onChange={(e) => setSlipFile(e.target.files?.[0] || null)} required className="cursor-pointer" />
                </div>
                <Button type="submit" className="w-full bg-slate-900 rounded-lg" disabled={creatingPayment}>Upload & Submit</Button>
              </form>
            </DialogContent>
          </Dialog>

        </main>
      </div>
    </AuthGuard>
  )
}