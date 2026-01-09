"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { AuthGuard } from "@/components/auth-guard"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
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
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { api, type User } from "@/lib/api"
import { toast } from "sonner"
import { ArrowLeft, UserPlus, Search, Trash2, Users } from "lucide-react"

export default function FriendsPage() {
  const router = useRouter()
  const [friends, setFriends] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState("")
  const [searchResults, setSearchResults] = useState<User[]>([])
  const [searching, setSearching] = useState(false)
  const [addFriendDialogOpen, setAddFriendDialogOpen] = useState(false)

  useEffect(() => {
    loadFriends()
  }, [])

  const loadFriends = async () => {
    try {
      const data = await api.getFriends()
      setFriends(data)
    } catch {
      toast.error("Failed to load friends")
    } finally {
      setLoading(false)
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
      // Search all users by email (for adding friends)
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080/api"}/users/search?q=${encodeURIComponent(query)}`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${localStorage.getItem("token")}`,
        },
      })
      if (response.ok) {
        const results = await response.json()
        // Filter out already friends
        const friendIds = new Set(friends.map(f => f.id))
        setSearchResults(results.filter((u: User) => !friendIds.has(u.id)))
      }
    } catch {
      toast.error("Failed to search users")
      setSearchResults([])
    } finally {
      setSearching(false)
    }
  }

  const handleAddFriend = async (userId: number) => {
    try {
      await api.addFriend(userId)
      toast.success("Friend added successfully")
      setSearchQuery("")
      setSearchResults([])
      loadFriends()
    } catch (error) {
      // Fix: Handle error type safely without using 'any'
      const message = error instanceof Error ? error.message : "Failed to add friend"
      toast.error(message)
    }
  }

  const handleRemoveFriend = async (friendId: number) => {
    try {
      await api.removeFriend(friendId)
      toast.success("Friend removed successfully")
      loadFriends()
    } catch {
      toast.error("Failed to remove friend")
    }
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
                <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100 leading-tight">Friends</h1>
                <p className="text-xs text-slate-500 hidden sm:block">Manage your friends</p>
              </div>
            </div>
            
            <Dialog open={addFriendDialogOpen} onOpenChange={setAddFriendDialogOpen}>
              <DialogTrigger asChild>
                <Button className="rounded-lg bg-slate-900 text-white hover:bg-slate-800">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Friend
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-xl">
                <DialogHeader>
                  <DialogTitle>Add Friend</DialogTitle>
                  <DialogDescription>Search for users by email or name</DialogDescription>
                </DialogHeader>
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Search</Label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                      <Input
                        placeholder="Search by email or name..."
                        value={searchQuery}
                        onChange={(e) => handleSearchUsers(e.target.value)}
                        className="pl-9"
                      />
                    </div>
                    {searchResults.length > 0 && (
                      <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto p-1">
                        {searchResults.map((user) => (
                          <div
                            key={user.id}
                            className="flex items-center justify-between p-2 rounded hover:bg-slate-50 cursor-pointer"
                            onClick={() => handleAddFriend(user.id)}
                          >
                            <div className="flex items-center gap-2">
                              <Avatar className="h-8 w-8">
                                <AvatarFallback className="text-xs">{user.name[0]}</AvatarFallback>
                              </Avatar>
                              <div>
                                <span className="text-sm font-medium">{user.name}</span>
                                <p className="text-xs text-slate-500">{user.email}</p>
                              </div>
                            </div>
                            <Button size="sm" variant="outline">
                              <UserPlus className="h-3 w-3 mr-1" />
                              Add
                            </Button>
                          </div>
                        ))}
                      </div>
                    )}
                    {searching && (
                      <p className="text-sm text-slate-500 text-center py-2">Searching...</p>
                    )}
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4">
                <div className="animate-spin h-8 w-8 border-4 border-slate-200 border-t-slate-800 rounded-full" />
                <p className="text-slate-500 font-medium animate-pulse">Loading...</p>
              </div>
            </div>
          ) : friends.length === 0 ? (
            <Card className="rounded-xl border-dashed border-2 border-slate-200 bg-slate-50/50 py-12 text-center">
              <div className="flex flex-col items-center">
                <div className="h-16 w-16 bg-white rounded-full flex items-center justify-center mb-4 shadow-sm border border-slate-100">
                  <Users className="h-8 w-8 text-slate-300" />
                </div>
                <h3 className="text-lg font-medium text-slate-900">No friends yet</h3>
                <p className="text-slate-500 max-w-sm mt-1 mb-6">Add friends to invite them to your expense groups.</p>
                <Button onClick={() => setAddFriendDialogOpen(true)} className="bg-slate-900">
                  <UserPlus className="h-4 w-4 mr-2" />
                  Add Your First Friend
                </Button>
              </div>
            </Card>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {friends.map((friend) => (
                <Card key={friend.id} className="rounded-xl border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                  <CardContent className="p-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-12 w-12 border border-slate-200">
                          <AvatarFallback className="text-sm bg-slate-100 text-slate-600">
                            {friend.name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-slate-900 dark:text-slate-100">{friend.name}</h3>
                          <p className="text-xs text-slate-500">{friend.email}</p>
                        </div>
                      </div>
                      <AlertDialog>
                        <AlertDialogTrigger asChild>
                          <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-600 hover:bg-red-50">
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </AlertDialogTrigger>
                        <AlertDialogContent>
                          <AlertDialogHeader>
                            <AlertDialogTitle>Remove Friend</AlertDialogTitle>
                            <AlertDialogDescription>
                              Remove {friend.name} from your friends list?
                            </AlertDialogDescription>
                          </AlertDialogHeader>
                          <AlertDialogFooter>
                            <AlertDialogCancel>Cancel</AlertDialogCancel>
                            <AlertDialogAction
                              onClick={() => handleRemoveFriend(friend.id)}
                              className="bg-red-600 hover:bg-red-700"
                            >
                              Remove
                            </AlertDialogAction>
                          </AlertDialogFooter>
                        </AlertDialogContent>
                      </AlertDialog>
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