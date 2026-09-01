import { useState, useRef, useEffect, useCallback } from "react"
import { v4 as uuidv4 } from "uuid"
import { supabase } from "@/lib/supabase"

const MAX_STORED_MESSAGES = 80
const ADMIN_SAVE_DELAY_MS = 450

export interface Message {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: number
  files?: string[]
}

interface ChatStorage {
  sessionId: string
  messages: Message[]
}

export type ChatPersistence =
  | { kind: "session"; storageKey: string }
  | { kind: "admin"; userId: string; storageKey?: string }

interface UseChatConfig {
  apiEndpoint: string
  apiKey: string
  persistence: ChatPersistence
  emptyReplyMessage?: string
  errorMessage?: string
}

function createEmptyChat(): ChatStorage {
  return { sessionId: uuidv4(), messages: [] }
}

function getStorageKey(persistence: ChatPersistence): string {
  if (persistence.kind === "session") return persistence.storageKey

  return persistence.storageKey ?? `arkbot-admin-chat:${persistence.userId}`
}

function getBrowserStorage(kind: ChatPersistence["kind"]): Storage {
  return kind === "session" ? sessionStorage : localStorage
}

function normalizeMessages(value: unknown): Message[] {
  if (!Array.isArray(value)) return []

  return value.filter(
    (message): message is Message =>
      typeof message === "object" &&
      message !== null &&
      typeof message.id === "string" &&
      (message.role === "user" || message.role === "assistant") &&
      typeof message.content === "string" &&
      typeof message.timestamp === "number"
  )
}

function limitMessages(messages: Message[]): Message[] {
  return messages.slice(-MAX_STORED_MESSAGES)
}

function loadLocalChat(persistence: ChatPersistence): ChatStorage {
  try {
    const raw = getBrowserStorage(persistence.kind).getItem(getStorageKey(persistence))
    if (!raw) return createEmptyChat()

    const parsed = JSON.parse(raw) as Partial<ChatStorage>
    if (typeof parsed.sessionId !== "string") return createEmptyChat()

    return {
      sessionId: parsed.sessionId,
      messages: normalizeMessages(parsed.messages),
    }
  } catch {
    return createEmptyChat()
  }
}

function saveLocalChat(
  kind: ChatPersistence["kind"],
  storageKey: string,
  chat: ChatStorage
) {
  try {
    getBrowserStorage(kind).setItem(
      storageKey,
      JSON.stringify({ ...chat, messages: limitMessages(chat.messages) })
    )
  } catch {
    // Local cache is an optimization; a full quota must not interrupt chat.
  }
}

async function loadAdminChat(userId: string): Promise<ChatStorage | null> {
  const { data, error } = await supabase
    .from("admin_chat_sessions")
    .select("session_id, messages")
    .eq("user_id", userId)
    .maybeSingle()

  if (error) throw error
  if (!data || typeof data.session_id !== "string") return null

  return {
    sessionId: data.session_id,
    messages: normalizeMessages(data.messages),
  }
}

async function saveAdminChat(userId: string, chat: ChatStorage) {
  const { error } = await supabase.from("admin_chat_sessions").upsert(
    {
      user_id: userId,
      session_id: chat.sessionId,
      messages: limitMessages(chat.messages),
    },
    { onConflict: "user_id" }
  )

  if (error) throw error
}

function formatHistoryError(error: unknown): string {
  if (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    error.code === "PGRST205"
  ) {
    return "Admin chat history is not configured in Supabase yet."
  }

  return "Admin chat history could not be synced to Supabase."
}

function sanitizeInput(text: string): string {
  return text
    .replace(/[<>]/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "")
    .trim()
    .slice(0, 4000)
}

export function useChat({
  apiEndpoint,
  apiKey,
  persistence,
  emptyReplyMessage = "Tidak ada jawaban.",
  errorMessage = "Gagal menghubungi server.",
}: UseChatConfig) {
  const adminUserId = persistence.kind === "admin" ? persistence.userId : null
  const storageKind = persistence.kind
  const storageKey = getStorageKey(persistence)
  const [chat, setChat] = useState<ChatStorage>(() => loadLocalChat(persistence))
  const sessionId = chat.sessionId
  const messages = chat.messages
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [isHistoryLoading, setIsHistoryLoading] = useState(Boolean(adminUserId))
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [selectedFiles, setSelectedFiles] = useState<File[]>([])

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const historyLoadedRef = useRef(!adminUserId)
  const hasUserInteractionRef = useRef(false)

  useEffect(() => {
    if (!adminUserId) return

    let cancelled = false
    historyLoadedRef.current = false
    setIsHistoryLoading(true)
    setHistoryError(null)

    void loadAdminChat(adminUserId)
      .then((remoteChat) => {
        if (!cancelled && remoteChat) {
          setChat((currentChat) =>
            hasUserInteractionRef.current ? currentChat : remoteChat
          )
        }
      })
      .catch((error) => {
        // The scoped local cache remains available if the database is offline.
        console.warn("Unable to load admin chat history:", error)
        if (!cancelled) setHistoryError(formatHistoryError(error))
      })
      .finally(() => {
        if (!cancelled) {
          historyLoadedRef.current = true
          setIsHistoryLoading(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [adminUserId])

  useEffect(() => {
    saveLocalChat(storageKind, storageKey, chat)
  }, [chat, storageKey, storageKind])

  useEffect(() => {
    if (!adminUserId || !historyLoadedRef.current) return

    const saveTimer = window.setTimeout(() => {
      void saveAdminChat(adminUserId, chat).catch((error) => {
        console.warn("Unable to save admin chat history:", error)
        setHistoryError(formatHistoryError(error))
      })
    }, ADMIN_SAVE_DELAY_MS)

    return () => window.clearTimeout(saveTimer)
  }, [adminUserId, chat, isHistoryLoading])

  const openFilePicker = useCallback(() => {
    const el = document.createElement("input")
    el.type = "file"
    el.multiple = true
    el.onchange = (event) => {
      const files = (event.target as HTMLInputElement).files
      if (files) setSelectedFiles((previous) => [...previous, ...Array.from(files)])
    }
    el.click()
  }, [])

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [messages, isLoading, scrollToBottom])

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = "auto"
    textarea.style.height = `${Math.min(textarea.scrollHeight, 152)}px`
  }, [input])

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.ctrlKey && event.key === "u") {
        event.preventDefault()
        openFilePicker()
      }
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [openFilePicker])

  const removeFile = useCallback((index: number) => {
    setSelectedFiles((previous) => previous.filter((_, fileIndex) => fileIndex !== index))
  }, [])

  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
    const files = Array.from(event.dataTransfer.files)
    if (files.length > 0) setSelectedFiles((previous) => [...previous, ...files])
  }, [])

  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault()
    event.stopPropagation()
  }, [])

  const sendMessage = useCallback(
    async (text: string) => {
      const sanitized = sanitizeInput(text)
      if ((!sanitized && selectedFiles.length === 0) || isLoading) return

      hasUserInteractionRef.current = true

      const fileNames = selectedFiles.map((file) => file.name)
      const userMsg: Message = {
        id: uuidv4(),
        role: "user",
        content: sanitized || "",
        timestamp: Date.now(),
        files: fileNames.length > 0 ? fileNames : undefined,
      }

      setChat((previous) => ({ ...previous, messages: [...previous.messages, userMsg] }))
      setInput("")
      setSelectedFiles([])
      setIsLoading(true)

      try {
        let response: Response

        if (selectedFiles.length > 0) {
          const formData = new FormData()
          formData.append("message", sanitized)
          formData.append("sessionId", sessionId)
          selectedFiles.forEach((file) => formData.append("files", file))

          response = await fetch(apiEndpoint, {
            method: "POST",
            headers: { "x-api-key": apiKey },
            body: formData,
            signal: AbortSignal.timeout(300000),
          })
        } else {
          response = await fetch(apiEndpoint, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "x-api-key": apiKey,
            },
            body: JSON.stringify({ message: sanitized, sessionId }),
            signal: AbortSignal.timeout(300000),
          })
        }

        if (!response.ok) {
          let responseError = `Server error (HTTP ${response.status})`
          try {
            const errorBody = await response.json()
            responseError = errorBody.message || errorBody.error || responseError
          } catch {
            try {
              const textBody = await response.text()
              if (textBody) responseError = textBody.slice(0, 200)
            } catch {
              // Keep the HTTP error if the response body cannot be parsed.
            }
          }
          throw new Error(responseError)
        }

        const data = await response.json()
        if (data.status === "error" || data.error) {
          throw new Error(data.message || data.error || "Workflow error")
        }

        const assistantMsg: Message = {
          id: uuidv4(),
          role: "assistant",
          content: data.reply ?? data.response ?? data.message ?? data.answer ?? emptyReplyMessage,
          timestamp: Date.now(),
        }
        setChat((previous) => ({
          ...previous,
          messages: [...previous.messages, assistantMsg],
        }))
      } catch (error) {
        console.error("Chat API error:", error)
        let detailedError = errorMessage
        if (error instanceof TypeError && error.message.includes("fetch")) {
          detailedError = "Server tidak dapat dijangkau. Periksa koneksi internet."
        } else if (error instanceof DOMException && error.name === "TimeoutError") {
          detailedError = "Server tidak merespon (timeout). Coba lagi nanti."
        } else if (error instanceof Error) {
          detailedError = error.message
        }

        const errorMsg: Message = {
          id: uuidv4(),
          role: "assistant",
          content: detailedError,
          timestamp: Date.now(),
        }
        setChat((previous) => ({
          ...previous,
          messages: [...previous.messages, errorMsg],
        }))
      } finally {
        setIsLoading(false)
      }
    },
    [
      apiEndpoint,
      apiKey,
      emptyReplyMessage,
      errorMessage,
      isLoading,
      selectedFiles,
      sessionId,
    ]
  )

  const handleKeyDown = useCallback(
    (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault()
        void sendMessage(input)
      }
    },
    [input, sendMessage]
  )

  const handleCopy = useCallback(async (text: string, id: string) => {
    await navigator.clipboard.writeText(text)
    setCopiedId(id)
    window.setTimeout(() => setCopiedId(null), 2000)
  }, [])

  const handleNewChat = useCallback(() => {
    hasUserInteractionRef.current = true
    setChat(createEmptyChat())
    setSelectedFiles([])
  }, [])

  const handleRegenerate = useCallback(
    (messageId: string) => {
      const messageIndex = messages.findIndex((message) => message.id === messageId)
      const previousUserMessage = messages
        .slice(0, messageIndex)
        .reverse()
        .find((message) => message.role === "user")

      if (previousUserMessage) {
        hasUserInteractionRef.current = true
        setChat((previous) => ({
          ...previous,
          messages: previous.messages.filter((message) => message.id !== messageId),
        }))
        void sendMessage(previousUserMessage.content)
      }
    },
    [messages, sendMessage]
  )

  return {
    messages,
    input,
    setInput,
    isLoading,
    isHistoryLoading,
    historyError,
    copiedId,
    selectedFiles,
    removeFile,
    messagesEndRef,
    textareaRef,
    sendMessage,
    handleKeyDown,
    handleCopy,
    handleNewChat,
    handleRegenerate,
    openFilePicker,
    handleDrop,
    handleDragOver,
  }
}
