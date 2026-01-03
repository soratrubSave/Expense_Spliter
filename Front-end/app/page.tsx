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
import { Plus, Users, LogOut, Receipt } from "lucide-react"

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
      // ✅ แก้เป็น toast.error ของ Sonner
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
      
      // ✅ แก้เป็น toast.success ของ Sonner
      toast.success("Group created successfully")
      
      setDialogOpen(false)
      setGroupName("")
      setGroupDescription("")
      loadGroups()
    } catch (error) {
      // ✅ แก้เป็น toast.error ของ Sonner
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
      <div className="min-h-screen bg-gradient-to-br from-background to-muted">
        <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="container mx-auto px-4 py-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-lg bg-primary flex items-center justify-center">
                <Receipt className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">SplitEase</h1>
                <p className="text-sm text-muted-foreground">Welcome, {user?.name}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={handleLogout}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-3xl font-bold">Your Groups</h2>
              <p className="text-muted-foreground">Manage your shared expenses</p>
            </div>
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Group
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create New Group</DialogTitle>
                  <DialogDescription>Create a group to split expenses with friends</DialogDescription>
                </DialogHeader>
                <form onSubmit={handleCreateGroup} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Group Name</Label>
                    <Input
                      id="name"
                      placeholder="Chiang Mai Trip"
                      value={groupName}
                      onChange={(e) => setGroupName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description (Optional)</Label>
                    <Textarea
                      id="description"
                      placeholder="3 days trip"
                      value={groupDescription}
                      onChange={(e) => setGroupDescription(e.target.value)}
                    />
                  </div>
                  <Button type="submit" className="w-full" disabled={creating}>
                    {creating ? "Creating..." : "Create Group"}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          {loading ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map((i) => (
                <Card key={i} className="animate-pulse">
                  <CardHeader>
                    <div className="h-6 bg-muted rounded w-3/4" />
                    <div className="h-4 bg-muted rounded w-1/2 mt-2" />
                  </CardHeader>
                </Card>
              ))}
            </div>
          ) : groups.length === 0 ? (
            <Card className="text-center py-12">
              <CardContent>
                <Users className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold mb-2">No groups yet</h3>
                <p className="text-muted-foreground mb-4">Create your first group to start splitting expenses</p>
                <Button onClick={() => setDialogOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Group
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {groups.map((group) => (
                <Card
                  key={group.id}
                  className="cursor-pointer hover:shadow-lg transition-shadow"
                  onClick={() => router.push(`/groups/${group.id}`)}
                >
                  <CardHeader>
                    <CardTitle>{group.name}</CardTitle>
                    <CardDescription>{group.description || "No description"}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Users className="h-4 w-4 mr-2" />
                      <span>Group</span>
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