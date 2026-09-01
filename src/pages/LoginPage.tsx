import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import { Bot, Loader2 } from "lucide-react"

type AuthMode = "login" | "register"

export function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [loading, setLoading] = useState(false)
  const navigate = useNavigate()

  const resetMessages = () => {
    setError("")
    setSuccess("")
  }

  const switchMode = (nextMode: AuthMode) => {
    setMode(nextMode)
    resetMessages()
    setConfirmPassword("")
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    resetMessages()
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setLoading(false)
      setError(error.message)
      return
    }

    // Check if user exists in pending_users and is approved
    const { data: pendingUser } = await supabase
      .from("pending_users")
      .select("status")
      .eq("email", email)
      .single()

    // If user not in pending_users or not approved, block them
    if (!pendingUser || pendingUser.status !== "approved") {
      await supabase.auth.signOut()
      setLoading(false)
      if (!pendingUser) {
        setError("Account not found. Please register first.")
      } else {
        setError("Your account is pending approval. Please wait for admin to approve.")
      }
      return
    }

    // Set login timestamp for 12-hour session expiration
    localStorage.setItem("login_timestamp", Date.now().toString())

    setLoading(false)
    navigate("/admin")
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    resetMessages()

    if (password !== confirmPassword) {
      setError("Passwords do not match")
      return
    }

    if (password.length < 6) {
      setError("Password must be at least 6 characters")
      return
    }

    setLoading(true)

    // Create auth user first
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    })

    if (error) {
      setLoading(false)
      setError(error.message)
      return
    }

    if (!data.user) {
      setLoading(false)
      setError("Failed to create account.")
      return
    }

    // Save to pending_users
    const { error: insertError } = await supabase.from("pending_users").insert({
      email,
      user_id: data.user.id,
      status: "pending",
    })

    if (insertError) {
      console.error("Insert error:", insertError)
      setLoading(false)
      setError("Failed to submit registration: " + insertError.message)
      return
    }

    // Sign out immediately
    await supabase.auth.signOut()

    setLoading(false)
    setSuccess("Registration submitted! Please wait for admin approval before signing in.")
    setEmail("")
    setPassword("")
    setConfirmPassword("")
  }

  const isRegister = mode === "register"

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-white/5 border border-white/[0.06]">
            <Bot className="h-7 w-7 text-orange-500" />
          </div>
          <h1 className="text-xl font-semibold text-white">ArkBot</h1>
          <p className="mt-1 text-sm text-white/40">
            {isRegister ? "Create a new account" : "Sign in to your account"}
          </p>
        </div>

        <div className="mb-6 flex rounded-xl border border-white/10 bg-white/5 p-1">
          <button
            type="button"
            onClick={() => switchMode("login")}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              !isRegister
                ? "bg-orange-500 text-white"
                : "text-white/50 hover:text-white/70"
            }`}
          >
            Sign in
          </button>
          <button
            type="button"
            onClick={() => switchMode("register")}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              isRegister
                ? "bg-orange-500 text-white"
                : "text-white/50 hover:text-white/70"
            }`}
          >
            Register
          </button>
        </div>

        <form
          onSubmit={isRegister ? handleRegister : handleLogin}
          className="space-y-4"
        >
          <div>
            <label className="mb-1.5 block text-sm font-medium text-white/50">
              Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-orange-500/50 transition-colors"
              placeholder="admin@example.com"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-sm font-medium text-white/50">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={isRegister ? 6 : undefined}
              className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-orange-500/50 transition-colors"
              placeholder="••••••••"
            />
            {!isRegister && (
              <p className="mt-2 text-xs leading-relaxed text-white/35">
                Forgot your password? Ask an approved dashboard administrator to reset it from Users.
              </p>
            )}
          </div>

          {isRegister && (
            <div>
              <label className="mb-1.5 block text-sm font-medium text-white/50">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-orange-500/50 transition-colors"
                placeholder="••••••••"
              />
            </div>
          )}

          {error && (
            <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-400">
              {error}
            </div>
          )}

          {success && (
            <div className="rounded-lg border border-green-500/20 bg-green-500/10 px-3 py-2 text-sm text-green-400">
              {success}
            </div>
          )}

          <Button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-orange-500 py-2.5 text-sm font-medium text-white hover:bg-orange-400 transition-colors"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : isRegister ? (
              "Create account"
            ) : (
              "Sign in"
            )}
          </Button>
        </form>
      </div>
    </div>
  )
}
