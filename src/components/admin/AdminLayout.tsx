import { useState, useEffect } from "react";
import { Outlet, NavLink, useNavigate, useLocation } from "react-router-dom";
import { supabase } from "@/lib/supabase";
import { manageAccount } from "@/lib/accountManagement";
import { useWorkflowErrors } from "@/hooks/useWorkflowErrors";
import { NotificationBell } from "@/components/NotificationBell";
import { FileText, MessageSquare, Upload, LogOut, Loader2, Menu, X, Users, KeyRound } from "lucide-react";
import { cn } from "@/lib/utils";

const navItems = [
  { to: "/admin/documents", icon: FileText, label: "Documents" },
  { to: "/admin/chat", icon: MessageSquare, label: "Chat" },
  { to: "/admin/upload", icon: Upload, label: "Upload" },
  { to: "/admin/registrations", icon: Users, label: "Users" },
];

export function AdminLayout() {
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [accountEmail, setAccountEmail] = useState<string | null>(null);
  const [accountUserId, setAccountUserId] = useState<string | null>(null);
  const [passwordModalOpen, setPasswordModalOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordError, setPasswordError] = useState("");
  const navigate = useNavigate();
  const location = useLocation();

  useWorkflowErrors();

  useEffect(() => {
    const checkSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();

        if (!session) {
          localStorage.removeItem("login_timestamp");
          setAccountEmail(null);
          setAccountUserId(null);
          navigate("/login");
          return;
        }

        setAccountEmail(session.user.email ?? null);
        setAccountUserId(session.user.id);

        // Check 12-hour session expiration
        const loginTimestampStr = localStorage.getItem("login_timestamp");
        const now = Date.now();
        const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

        if (loginTimestampStr) {
          const loginTimestamp = parseInt(loginTimestampStr, 10);
          if (isNaN(loginTimestamp) || now - loginTimestamp > TWELVE_HOURS_MS) {
            localStorage.removeItem("login_timestamp");
            setAccountEmail(null);
            setAccountUserId(null);
            try {
              await supabase.auth.signOut();
            } catch (err) {
              console.error("Sign out error:", err);
            }
            navigate("/login");
            return;
          }
        } else {
          // If session exists but no timestamp, set it to now
          localStorage.setItem("login_timestamp", now.toString());
        }

        // Check if user still exists in pending_users
        const { data } = await supabase.from("pending_users").select("status").eq("email", session.user.email).single();

        if (!data || data.status !== "approved") {
          localStorage.removeItem("login_timestamp");
          setAccountEmail(null);
          setAccountUserId(null);
          try {
            await supabase.auth.signOut();
          } catch (err) {
            console.error("Sign out error:", err);
          }
          navigate("/login");
          return;
        }

        setLoading(false);
      } catch (err) {
        console.error("Session verification failed:", err);
        localStorage.removeItem("login_timestamp");
        setAccountEmail(null);
        setAccountUserId(null);
        try {
          await supabase.auth.signOut();
        } catch (signOutErr) {
          console.error("Sign out error:", signOutErr);
        }
        navigate("/login");
      }
    };

    checkSession();

    // Periodically check every 1 minute to log out if 12 hours passes while user has dashboard open
    const interval = setInterval(() => {
      const loginTimestampStr = localStorage.getItem("login_timestamp");
      if (loginTimestampStr) {
        const loginTimestamp = parseInt(loginTimestampStr, 10);
        const now = Date.now();
        const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;
        if (!isNaN(loginTimestamp) && now - loginTimestamp > TWELVE_HOURS_MS) {
          localStorage.removeItem("login_timestamp");
          supabase.auth
            .signOut()
            .catch((err) => console.error("Auto sign out error:", err))
            .finally(() => {
              navigate("/login");
            });
        }
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [navigate]);

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  const handleLogout = async () => {
    localStorage.removeItem("login_timestamp");
    setAccountEmail(null);
    setAccountUserId(null);
    try {
      await supabase.auth.signOut();
    } catch (err) {
      console.error("Sign out error:", err);
    }
    navigate("/login");
  };

  const openPasswordModal = () => {
    setPasswordError("");
    setNewPassword("");
    setConfirmPassword("");
    setPasswordModalOpen(true);
  };

  const handlePasswordChange = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!accountUserId) return;

    if (newPassword.length < 6) {
      setPasswordError("Password must be at least 6 characters.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("Passwords do not match.");
      return;
    }

    setPasswordLoading(true);
    setPasswordError("");
    try {
      await manageAccount({ action: "update", user_id: accountUserId, password: newPassword });
      setPasswordModalOpen(false);
      setNewPassword("");
      setConfirmPassword("");
    } catch (error) {
      setPasswordError(error instanceof Error ? error.message : "Unable to update password.");
    } finally {
      setPasswordLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-white/40" />
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background">
      {/* Mobile overlay */}
      <div className={cn("fixed inset-0 z-40 bg-black/50 transition-opacity duration-200 lg:hidden", sidebarOpen ? "opacity-100" : "opacity-0 pointer-events-none")} onClick={() => setSidebarOpen(false)} />

      {/* Sidebar */}
      <aside className={cn("fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-white/[0.06] bg-[#131314] transition-transform duration-200 lg:relative lg:translate-x-0", sidebarOpen ? "translate-x-0" : "-translate-x-full")}>
        {/* Header */}
        <div className="flex h-14 items-center justify-between border-b border-white/[0.06] px-4">
          <img src="/logo-arka.png" alt="Arka Logo" className="h-5 w-auto shrink-0 object-contain" />
          <button onClick={() => setSidebarOpen(false)} className="text-white/50 hover:text-white/80 lg:hidden">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-1 p-3">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={() => setSidebarOpen(false)}
              className={({ isActive }) => cn("flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors", isActive ? "bg-white/10 text-white" : "text-white/50 hover:bg-white/5 hover:text-white/80")}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.label}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="border-t border-white/[0.06] p-3">
          {accountEmail && (
            <div className="mb-2 flex min-w-0 items-center gap-2.5 rounded-lg px-3 py-2" title={accountEmail}>
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-orange-500/15 text-xs font-semibold uppercase text-orange-400">{accountEmail.slice(0, 1)}</div>
              <div className="min-w-0">
                <p className="truncate text-xs font-medium text-white/75">{accountEmail}</p>
              </div>
              <button
                type="button"
                onClick={openPasswordModal}
                title="Change password"
                className="ml-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-white/40 transition-colors hover:bg-white/5 hover:text-orange-400"
              >
                <KeyRound className="h-4 w-4" />
              </button>
            </div>
          )}
          <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-white/50 transition-colors hover:bg-white/5 hover:text-white/80">
            <LogOut className="h-4 w-4 shrink-0" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 overflow-hidden flex flex-col min-w-0">
        {/* Top bar */}
        <div className="flex items-center h-14 px-4 border-b border-white/[0.06] shrink-0 bg-[#0a0a0a]">
          <button onClick={() => setSidebarOpen(true)} className="mr-3 text-white/60 hover:text-white/80 lg:hidden">
            <Menu className="h-5 w-5" />
          </button>
          <div className="ml-auto">
            <NotificationBell />
          </div>
        </div>
        <div className="flex-1 overflow-auto overflow-x-hidden">
          <Outlet context={{ accountUserId }} />
        </div>
      </main>

      {passwordModalOpen && (
        <div className="fixed inset-0 z-[60] flex items-end justify-center bg-black/60 p-4 sm:items-center">
          <div className="w-full max-w-sm rounded-xl border border-white/[0.06] bg-[#1a1a1b] p-5 shadow-xl">
            <div className="mb-5">
              <h2 className="text-base font-semibold text-white">Change password</h2>
              <p className="mt-1 truncate text-xs text-white/40">{accountEmail}</p>
            </div>
            <form onSubmit={handlePasswordChange} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/45">New password</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  minLength={6}
                  required
                  autoFocus
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-orange-500/50"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-white/45">Confirm password</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  minLength={6}
                  required
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white outline-none transition-colors focus:border-orange-500/50"
                />
              </div>
              {passwordError && <p className="text-sm text-red-300">{passwordError}</p>}
              <div className="flex gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setPasswordModalOpen(false)}
                  className="flex-1 rounded-lg border border-white/10 px-3 py-2.5 text-sm font-medium text-white/60 transition-colors hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={passwordLoading}
                  className="flex flex-1 items-center justify-center rounded-lg bg-orange-500 px-3 py-2.5 text-sm font-medium text-white transition-colors hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {passwordLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update password"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
