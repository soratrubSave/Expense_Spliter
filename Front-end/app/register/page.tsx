"use client"

import type React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { api } from "@/lib/api"
import { toast } from "sonner"
import { Receipt, UserPlus, Sparkles } from "lucide-react"

export default function RegisterPage() {
  const router = useRouter()
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await api.register(email, name, password)
      localStorage.setItem("token", response.token)
      localStorage.setItem("user", JSON.stringify(response.user))
      
      toast.success("Account created!", {
        description: "Welcome to Expense Spliter.",
      })
      
      router.push("/")
    } catch (error) {
      toast.error("Registration failed", {
        description: error instanceof Error ? error.message : "Something went wrong. Please try again.",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      {/* ส่วนซ้าย: รูปภาพ Background (Camping Theme) */}
      <div className="hidden bg-muted lg:block relative h-full overflow-hidden">
        <Image
          // รูปแคมป์ปิ้ง สื่อถึงทริปที่ต้องหารค่าใช้จ่าย
          src="https://images.unsplash.com/photo-1478131143081-80f7f84ca84d?q=80&w=2000&auto=format&fit=crop"
          alt="Camping with friends"
          fill
          className="object-cover transition-transform duration-700 hover:scale-105"
          priority
        />
        
        {/* Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-end p-12">
          <div className="text-white z-20 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/10 text-sm font-medium">
              <Sparkles className="w-4 h-4 text-yellow-300" />
              <span>Start your journey</span>
            </div>
            <h3 className="text-4xl font-bold leading-tight">
              Create an account, <br/> start sharing moments.
            </h3>
            <p className="text-gray-300 text-lg max-w-md font-light">
              Join thousands of users who manage their group finances effortlessly. No more awkward money conversations.
            </p>
          </div>
        </div>
      </div>

      {/* ส่วนขวา: ฟอร์ม Register */}
      <div className="flex items-center justify-center py-12 px-4 bg-background">
        <div className="mx-auto grid w-full max-w-[350px] gap-6">
          <div className="flex flex-col items-center text-center space-y-2">
            <div className="h-12 w-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mb-2 shadow-lg shadow-primary/30">
              <UserPlus className="h-6 w-6" />
            </div>
            <h1 className="text-3xl font-bold tracking-tight">Create an account</h1>
            <p className="text-balance text-muted-foreground">
              Enter your details to get started
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="grid gap-4 mt-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="John Doe"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                placeholder="Min 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="h-11"
              />
            </div>
            <Button type="submit" className="w-full h-11 text-base font-medium shadow-md transition-all hover:shadow-lg" disabled={loading}>
              {loading ? "Creating account..." : "Sign Up"}
            </Button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Already have an account?
              </span>
            </div>
          </div>

          <div className="text-center">
            <Link href="/login">
              <Button variant="ghost" className="w-full h-11 hover:bg-muted/50">
                Sign in instead
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}