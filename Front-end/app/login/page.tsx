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
import { Receipt, Users, Wallet } from "lucide-react"

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await api.login(email, password)
      localStorage.setItem("token", response.token)
      localStorage.setItem("user", JSON.stringify(response.user))
      
      toast.success("Login successful!", {
        description: "Welcome back!",
      })
      
      router.push("/")
    } catch (error) {
      toast.error("Login failed", {
        description: error instanceof Error ? error.message : "Invalid email or password",
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full lg:grid lg:min-h-screen lg:grid-cols-2">
      {/* ส่วนซ้าย: รูปภาพ Background */}
      <div className="hidden bg-muted lg:block relative h-full overflow-hidden">
        <Image
          // รูปที่คุณเลือก: Friends on a car roof looking at mountains
          src="https://images.unsplash.com/photo-1539635278303-d4002c07eae3?q=80&w=2000&auto=format&fit=crop"
          alt="Friends on a road trip"
          fill
          className="object-cover transition-transform duration-700 hover:scale-105"
          priority
        />
        
        {/* Overlay แบบไล่สีเข้มด้านล่าง */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent flex items-end p-12">
          <div className="text-white z-20 space-y-4">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/20 backdrop-blur-md border border-white/10 text-sm font-medium">
              <Wallet className="w-4 h-4" />
              <span>Smart Expense Tracking</span>
            </div>
            <h3 className="text-4xl font-bold leading-tight">
              Enjoy the journey, <br/> leave the math to us.
            </h3>
            <p className="text-gray-300 text-lg max-w-md font-light">
              Make memories with friends without worrying about who paid for what. Settle up expenses easily after the trip.
            </p>
          </div>
        </div>
      </div>

      {/* ส่วนขวา: ฟอร์ม Login */}
      <div className="flex items-center justify-center py-12 px-4 bg-background">
        <div className="mx-auto grid w-full max-w-[350px] gap-6">
          <div className="flex flex-col items-center text-center space-y-2">
            {/* Logo Icon */}
            <div className="h-12 w-12 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center mb-2 shadow-lg shadow-primary/30">
              <Users className="h-6 w-6" />
            </div>
            
            <h1 className="text-3xl font-bold tracking-tight">Welcome Back</h1>
            <p className="text-balance text-muted-foreground">
              Sign in to continue to your dashboard
            </p>
          </div>
          
          <form onSubmit={handleSubmit} className="grid gap-4 mt-4">
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
              <div className="flex items-center justify-between">
                <Label htmlFor="password">Password</Label>
                <Link href="#" className="text-sm font-medium text-primary hover:underline">
                  Forgot password?
                </Link>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                className="h-11"
              />
            </div>
            <Button type="submit" className="w-full h-11 text-base font-medium shadow-md transition-all hover:shadow-lg" disabled={loading}>
              {loading ? "Signing in..." : "Sign in to Account"}
            </Button>
          </form>

          <div className="relative my-4">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                New here?
              </span>
            </div>
          </div>

          <div className="text-center">
            <Link href="/register">
              <Button variant="outline" className="w-full h-11 border-dashed hover:border-solid hover:bg-muted/50">
                Create new account
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}