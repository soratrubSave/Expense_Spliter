"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
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
import { Textarea } from "@/components/ui/textarea"
import { api, type Group, type User } from "@/lib/api"
import { toast } from "sonner"
import { Plus, Users, LogOut, Receipt, Sparkles, Coffee } from "lucide-react"

export default function DashboardPage() {
  const router = useRouter()
  const [groups, setGroups] = useState<Group[]>([])
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<User | null>(null)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [groupName, setGroupName] = useState("")
  const [groupDescription, setGroupDescription] = useState("")
  const [creating, setCreating] = useState(false)

  useEffect(() => {
    const userData = localStorage.getItem("user")
    if (userData) {
      setUser(JSON.parse(userData))
    }
    loadGroups()
  }, [])

  const loadGroups = async () => {
    try {
      const data = await api.getGroups()
      setGroups(data)
    } catch (error) {
      toast.error("Failed to load groups")
    } finally {
      setLoading(false)
    }
  }

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)

    try {
      await api.createGroup(groupName, groupDescription)
      toast.success("Group created successfully")
      setDialogOpen(false)
      setGroupName("")
      setGroupDescription("")
      loadGroups()
    } catch (error) {
      toast.error("Failed to create group")
    } finally {
      setCreating(false)
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("token")
    localStorage.removeItem("user")
    router.push("/login")
  }

  return (
    <AuthGuard>
      {/* เพิ่มพื้นหลัง Gradient นุ่มๆ */}
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-violet-950 transition-colors duration-500">
        
        {/* Header แบบลอยตัวและโค้งมนเล็กน้อย */}
        <header className="sticky top-0 z-10 border-b bg-white/70 dark:bg-slate-900/70 backdrop-blur-md shadow-sm">
          <div className="container mx-auto px-6 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Receipt className="h-5 w-5 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                  SplitEase
                </h1>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                onClick={() => router.push("/friends")}
                className="hidden md:flex items-center gap-2 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <Users className="h-4 w-4" />
                Friends
              </Button>
              <div className="hidden md:block text-right">
                <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                  {user?.name}
                </p>
                <p className="text-xs text-muted-foreground">Logged in</p>
              </div>
              <Button 
                variant="ghost" 
                size="icon" 
                onClick={handleLogout}
                className="rounded-full hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 transition-colors"
              >
                <LogOut className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-6 py-10">
          {/* ส่วนหัวข้อ Welcome ที่ดูเป็นกันเอง */}
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-10 gap-4">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
                Hello, {user?.name?.split(" ")[0]}! 
              </h2>
              <p className="text-slate-500 dark:text-slate-400 mt-2 text-lg">
                Ready to split bills and keep friendships?
              </p>
            </div>

            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-lg shadow-indigo-500/25 px-6 h-12 text-base transition-all hover:scale-105 active:scale-95">
                  <Plus className="h-5 w-5 mr-2" />
                  Create New Group
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[425px] rounded-2xl">
                <DialogHeader>
                  <div className="mx-auto bg-indigo-100 w-12 h-12 rounded-full flex items-center justify-center mb-2 dark:bg-indigo-900/50">
                    <Sparkles className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />
                  </div>
                  <DialogTitle className="text-center text-xl">Create New Group</DialogTitle>
                  <DialogDescription className="text-center">
                    Set up a space to track shared expenses.
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateGroup} className="space-y-5 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-indigo-900 dark:text-indigo-100">Group Name</Label>
                    <Input
                      id="name"
                      placeholder="e.g., Trip to Japan 🇯🇵"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      required
                      className="rounded-xl border-slate-200 focus-visible:ring-indigo-500"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description" className="text-indigo-900 dark:text-indigo-100">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      placeholder="e.g., Food, Transport, and Hotels"
                      value={groupDescription}
                      onChange={(e) => setGroupDescription(e.target.value)}
                      className="rounded-xl border-slate-200 focus-visible:ring-indigo-500 resize-none"
                    />
                  </div>
                  <Button 
                    type="submit" 
                    className="w-full rounded-xl bg-indigo-600 hover:bg-indigo-700 h-11" 
                    disabled={creating}
                  >
                    {creating ? "Creating..." : "Create Group ✨"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {/* Grid การ์ดกลุ่ม */}
          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse rounded-2xl border-0 shadow-sm">
                  <CardHeader>
                    <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded-full w-3/4" />
                    <div className="h-4 bg-slate-100 dark:bg-slate-800 rounded-full w-1/2 mt-3" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : groups.length === 0 ? (
            <Card className="text-center py-16 border-dashed border-2 rounded-3xl bg-white/50 dark:bg-slate-900/50">
              <CardContent className="flex flex-col items-center">
                <div className="h-20 w-20 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center mb-6">
                  <Coffee className="h-10 w-10 text-indigo-400" />
                </div>
                <h3 className="text-xl font-bold text-slate-800 dark:text-slate-200 mb-2">No groups yet</h3>
                <p className="text-slate-500 max-w-sm mx-auto mb-8">
                  Looks like you haven&apos;t joined any expense groups. Create one to start splitting bills with your friends!
                </p>
                <Button 
                  onClick={() => setDialogOpen(true)} 
                  variant="outline"
                  className="rounded-full border-indigo-200 text-indigo-700 hover:bg-indigo-50 hover:text-indigo-800 dark:border-indigo-800 dark:text-indigo-300"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Group
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {groups.map((group) => (
                <Card
                  key={group.id}
                  className="group cursor-pointer rounded-2xl border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/80 shadow-sm hover:shadow-xl hover:shadow-indigo-500/10 hover:-translate-y-1 transition-all duration-300 overflow-hidden"
                  onClick={() => router.push(`/groups/${group.id}`)}
                >
                  {/* แถบสีด้านบนการ์ด */}
                  <div className="h-2 w-full bg-gradient-to-r from-indigo-400 to-purple-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start mb-2">
                      <div className="p-2.5 bg-indigo-50 dark:bg-indigo-950/50 rounded-xl group-hover:bg-indigo-100 dark:group-hover:bg-indigo-900 transition-colors text-indigo-600 dark:text-indigo-400">
                        <Users className="h-6 w-6" />
                      </div>
                    </div>
                    <CardTitle className="text-xl text-slate-800 dark:text-slate-100 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                      {group.name}
                    </CardTitle>
                    <CardDescription className="line-clamp-2 text-slate-500">
                      {group.description || "No description provided"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between pt-4 border-t border-slate-100 dark:border-slate-800 mt-2">
                      <span className="text-xs font-medium text-slate-400 bg-slate-50 dark:bg-slate-800 px-2 py-1 rounded-md">
                        Active Group
                      </span>
                      <span className="text-xs text-indigo-500 flex items-center font-medium opacity-0 group-hover:opacity-100 transition-opacity -translate-x-2 group-hover:translate-x-0 duration-300">
                        View Details →
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  )
}