import { supabase } from "@/lib/supabase"

type AccountAction =
  | { action: "delete"; user_id: string }
  | { action: "update"; user_id: string; password: string }

export async function manageAccount(action: AccountAction) {
  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (!session) throw new Error("Your session has expired. Please sign in again.")

  const response = await fetch(
    `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/delete-auth-user`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
        Authorization: `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(action),
    }
  )
  const data = await response.json().catch(() => ({}))

  if (!response.ok || data.error) {
    throw new Error(data.error || "Account action failed")
  }
}
