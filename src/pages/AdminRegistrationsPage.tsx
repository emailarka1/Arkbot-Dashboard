import { useState, useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { manageAccount } from "@/lib/accountManagement"
import { Button } from "@/components/ui/button"
import {
  Loader2,
  CheckCircle2,
  Clock,
  UserCheck,
  UserX,
  RefreshCw,
  Trash2,
  Users,
  AlertTriangle,
  KeyRound,
  Search,
  X,
} from "lucide-react"

type PendingUser = {
  id: string
  email: string
  user_id: string
  status: "pending" | "approved"
  created_at: string
}

export function AdminRegistrationsPage() {
  const [users, setUsers] = useState<PendingUser[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<PendingUser | null>(null)
  const [editUser, setEditUser] = useState<PendingUser | null>(null)
  const [editPassword, setEditPassword] = useState("")
  const [actionError, setActionError] = useState("")
  const [activeTab, setActiveTab] = useState<"pending" | "approved">("pending")
  const [searchQuery, setSearchQuery] = useState("")

  const fetchUsers = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("pending_users")
      .select("*")
      .order("created_at", { ascending: false })

    if (!error && data) {
      setUsers(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  const openEdit = (user: PendingUser) => {
    setActionError("")
    setEditUser(user)
    setEditPassword("")
  }

  const handleEdit = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!editUser) return

    if (editPassword.length < 6) {
      setActionError("New password must be at least 6 characters.")
      return
    }

    setActionError("")
    setActionLoading(editUser.id)

    try {
      await manageAccount({
        action: "update",
        user_id: editUser.user_id,
        password: editPassword,
      })
      setEditUser(null)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to update account.")
    } finally {
      setActionLoading(null)
    }
  }

  const handleApprove = async (user: PendingUser) => {
    setActionLoading(user.id)
    const { error } = await supabase
      .from("pending_users")
      .update({ status: "approved" })
      .eq("id", user.id)

    if (!error) {
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, status: "approved" } : u))
      )
    }
    setActionLoading(null)
  }

  const handleReject = async (user: PendingUser) => {
    setActionLoading(user.id)
    setActionError("")

    try {
      await manageAccount({ action: "delete", user_id: user.user_id })
      setUsers((prev) => prev.filter((u) => u.id !== user.id))
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to reject account.")
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (user: PendingUser) => {
    setActionLoading(user.id)
    setActionError("")

    try {
      await manageAccount({ action: "delete", user_id: user.user_id })
      setUsers((prev) => prev.filter((u) => u.id !== user.id))
      setDeleteConfirm(null)
    } catch (error) {
      setActionError(error instanceof Error ? error.message : "Unable to delete account.")
    } finally {
      setActionLoading(null)
    }
  }

  const normalizedQuery = searchQuery.trim().toLowerCase()
  const matchingUsers = normalizedQuery
    ? users.filter((user) => user.email.toLowerCase().includes(normalizedQuery))
    : users
  const pendingUsers = matchingUsers.filter((user) => user.status === "pending")
  const approvedUsers = matchingUsers.filter((user) => user.status === "approved")
  const pendingCount = pendingUsers.length

  const statusIcon = (status: string) => {
    switch (status) {
      case "approved":
        return <CheckCircle2 className="h-4 w-4 text-green-400" />
      default:
        return <Clock className="h-4 w-4 text-yellow-400" />
    }
  }

  const statusBadge = (status: string) => {
    const base = "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
    switch (status) {
      case "approved":
        return `${base} bg-green-500/10 text-green-400 border border-green-500/20`
      default:
        return `${base} bg-yellow-500/10 text-yellow-400 border border-yellow-500/20`
    }
  }

  return (
    <div className="p-4 sm:p-6 space-y-4 sm:space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-semibold text-white">Users</h1>
        </div>
        <Button
          onClick={fetchUsers}
          variant="outline"
          size="sm"
          className="shrink-0 border-white/10 text-white/60 hover:text-white"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
          <span className="hidden sm:inline ml-2">Refresh</span>
        </Button>
      </div>

      {actionError && (
        <div className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
          {actionError}
        </div>
      )}

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/35" />
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search users by email..."
          className="w-full rounded-lg border border-white/10 bg-white/[0.03] py-2.5 pl-10 pr-10 text-sm text-white outline-none transition-colors placeholder:text-white/30 focus:border-orange-500/50"
        />
        {searchQuery && (
          <button
            type="button"
            onClick={() => setSearchQuery("")}
            title="Clear search"
            className="absolute right-2 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-white/35 transition-colors hover:bg-white/5 hover:text-white/70"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 overflow-x-auto">
        <button
          onClick={() => setActiveTab("pending")}
          className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors ${
            activeTab === "pending"
              ? "bg-orange-500 text-white"
              : "bg-white/5 text-white/50 hover:text-white/70"
          }`}
        >
          <Clock className="h-4 w-4" />
          Pending
          {pendingCount > 0 && (
            <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-xs">
              {pendingCount}
            </span>
          )}
        </button>
        <button
          onClick={() => setActiveTab("approved")}
          className={`flex items-center gap-2 whitespace-nowrap rounded-lg px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium transition-colors ${
            activeTab === "approved"
              ? "bg-green-600 text-white"
              : "bg-white/5 text-white/50 hover:text-white/70"
          }`}
        >
          <Users className="h-4 w-4" />
          Active
          <span className="rounded-full bg-white/20 px-1.5 py-0.5 text-xs">
            {approvedUsers.length}
          </span>
        </button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-white/40" />
        </div>
      ) : activeTab === "pending" ? (
        pendingUsers.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-white/40">
            <UserCheck className="h-12 w-12 mb-3 opacity-50" />
            <p className="text-sm">{normalizedQuery ? "No matching pending users" : "No pending registrations"}</p>
          </div>
        ) : (
          <div className="space-y-3">
          {pendingUsers.map((user) => (
              <div
                key={user.id}
                className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 sm:p-4 space-y-3"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full bg-yellow-500/10">
                    <span className="text-sm font-medium text-yellow-400">
                      {user.email.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white truncate">{user.email}</p>
                    <p className="text-xs text-white/30 mt-0.5">
                      {new Date(user.created_at).toLocaleDateString("id-ID", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className={statusBadge("pending")}>
                    {statusIcon("pending")}
                    pending
                  </span>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => openEdit(user)}
                      disabled={actionLoading === user.id}
                      size="sm"
                      variant="outline"
                      className="h-8 border-white/10 text-white/60 hover:bg-white/5 hover:text-white"
                    >
                      <KeyRound className="h-3.5 w-3.5 sm:mr-1.5" />
                      <span className="hidden sm:inline">Password</span>
                    </Button>
                    <Button
                      onClick={() => handleApprove(user)}
                      disabled={actionLoading === user.id}
                      size="sm"
                      className="h-8 bg-green-600 hover:bg-green-500 text-white"
                    >
                      {actionLoading === user.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <>
                          <CheckCircle2 className="h-3.5 w-3.5 sm:mr-1.5" />
                          <span className="hidden sm:inline">Approve</span>
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => handleReject(user)}
                      disabled={actionLoading === user.id}
                      size="sm"
                      variant="outline"
                      className="h-8 border-red-500/30 text-red-400 hover:bg-red-500/10"
                    >
                      <UserX className="h-3.5 w-3.5 sm:mr-1.5" />
                      <span className="hidden sm:inline">Reject</span>
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )
      ) : approvedUsers.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-white/40">
          <Users className="h-12 w-12 mb-3 opacity-50" />
          <p className="text-sm">{normalizedQuery ? "No matching active users" : "No active users"}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {approvedUsers.map((user) => (
            <div
              key={user.id}
              className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-3 sm:p-4 space-y-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="flex h-9 w-9 sm:h-10 sm:w-10 shrink-0 items-center justify-center rounded-full bg-green-500/10">
                  <span className="text-sm font-medium text-green-400">
                    {user.email.charAt(0).toUpperCase()}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-white truncate">{user.email}</p>
                  <p className="text-xs text-white/30 mt-0.5">
                    {new Date(user.created_at).toLocaleDateString("id-ID", {
                      day: "numeric",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2">
                <span className={statusBadge("approved")}>
                  {statusIcon("approved")}
                  active
                </span>

                <div className="flex gap-2">
                  <Button
                    onClick={() => openEdit(user)}
                    disabled={actionLoading === user.id}
                    size="sm"
                    variant="outline"
                    className="h-8 border-white/10 text-white/60 hover:bg-white/5 hover:text-white"
                  >
                    <KeyRound className="h-3.5 w-3.5 sm:mr-1.5" />
                    <span className="hidden sm:inline">Password</span>
                  </Button>
                  <Button
                    onClick={() => setDeleteConfirm(user)}
                    disabled={actionLoading === user.id}
                    size="sm"
                    variant="outline"
                    className="h-8 border-red-500/30 text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-sm rounded-xl border border-white/[0.06] bg-[#1a1a1b] p-5 sm:p-6 shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-500/10">
                <AlertTriangle className="h-5 w-5 text-red-400" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-white">Delete User</h3>
                <p className="text-xs text-white/40">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-sm text-white/60 mb-6">
              Are you sure you want to delete <span className="font-medium text-white break-all">{deleteConfirm.email}</span>?
            </p>

            <div className="flex gap-3">
              <Button
                onClick={() => setDeleteConfirm(null)}
                variant="outline"
                className="flex-1 border-white/10 text-white/60"
              >
                Cancel
              </Button>
              <Button
                onClick={() => handleDelete(deleteConfirm)}
                disabled={actionLoading === deleteConfirm.id}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white"
              >
                {actionLoading === deleteConfirm.id ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  "Delete"
                )}
              </Button>
            </div>
          </div>
        </div>
      )}

      {editUser && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="w-full max-w-md rounded-xl border border-white/[0.06] bg-[#1a1a1b] p-5 shadow-xl sm:p-6">
            <div className="mb-5">
              <h3 className="text-base font-semibold text-white">Change password</h3>
              <p className="mt-1 break-all text-xs text-white/40">{editUser.email}</p>
            </div>

            <form onSubmit={handleEdit} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/45">New password</label>
                <input
                  type="password"
                  value={editPassword}
                  onChange={(event) => setEditPassword(event.target.value)}
                  minLength={6}
                  required
                  placeholder="At least 6 characters"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white placeholder:text-white/25 outline-none transition-colors focus:border-orange-500/50"
                />
              </div>

              {actionError && <p className="text-sm text-red-300">{actionError}</p>}

              <div className="flex gap-3 pt-1">
                <Button
                  type="button"
                  onClick={() => setEditUser(null)}
                  variant="outline"
                  className="flex-1 border-white/10 text-white/60 hover:text-white"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={actionLoading === editUser.id}
                  className="flex-1 bg-orange-500 text-white hover:bg-orange-400"
                >
                  {actionLoading === editUser.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
