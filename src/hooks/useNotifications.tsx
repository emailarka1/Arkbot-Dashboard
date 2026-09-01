import { createContext, useContext, useState, useCallback, useEffect, ReactNode } from "react"

interface Notification {
  id: string
  title: string
  message: string
  timestamp: string
  read: boolean
}

interface NotificationContextType {
  notifications: Notification[]
  unreadCount: number
  addNotification: (title: string, message: string) => void
  markAsRead: (id: string) => void
  markAllRead: () => void
  clearAll: () => void
}

const NotificationContext = createContext<NotificationContextType | null>(null)

const STORAGE_KEY = "arkbot-notifications"
const MAX_NOTIFICATIONS = 50
const EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 jam

function loadNotifications(): Notification[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const items: Notification[] = JSON.parse(raw)
    const now = Date.now()
    return items.filter((n) => now - new Date(n.timestamp).getTime() < EXPIRY_MS)
  } catch {
    return []
  }
}

function saveNotifications(items: Notification[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch {}
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [notifications, setNotifications] = useState<Notification[]>(loadNotifications)

  useEffect(() => {
    saveNotifications(notifications)
  }, [notifications])

  const addNotification = useCallback((title: string, message: string) => {
    const newNotif: Notification = {
      id: crypto.randomUUID(),
      title,
      message,
      timestamp: new Date().toISOString(),
      read: false,
    }
    setNotifications((prev) => [newNotif, ...prev].slice(0, MAX_NOTIFICATIONS))
  }, [])

  const markAsRead = useCallback((id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    )
  }, [])

  const markAllRead = useCallback(() => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
  }, [])

  const clearAll = useCallback(() => {
    setNotifications([])
  }, [])

  const unreadCount = notifications.filter((n) => !n.read).length

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, addNotification, markAsRead, markAllRead, clearAll }}
    >
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const ctx = useContext(NotificationContext)
  if (!ctx) throw new Error("useNotifications must be used within NotificationProvider")
  return ctx
}
