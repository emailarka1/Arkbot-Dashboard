import { useEffect } from "react"
import ReactMarkdown from "react-markdown"
import { useOutletContext } from "react-router-dom"
import {
  Bot,
  Copy,
  RotateCcw,
  Check,
  Sparkles,
  Paperclip,
  Plus,
  X,
  FileText,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useChat } from "@/hooks/useChat"

const CHAT_API_URL =
  "https://arkbot-n8n.6jkqbm.easypanel.host/webhook/chat-widget"
const CHAT_API_KEY = import.meta.env.VITE_CHAT_API_KEY || ""

function formatContent(text: string) {
  return text.replace(
    /(https?:\/\/[^\s<>")\]]+)/g,
    "[$1]($1)"
  )
}

export function AdminChatPage() {
  const { accountUserId } = useOutletContext<{ accountUserId: string | null }>()
  if (!accountUserId) return null

  return <AdminChatContent userId={accountUserId} />
}

function AdminChatContent({ userId }: { userId: string }) {
  useEffect(() => {
    // This legacy key was shared by every admin using the same browser.
    localStorage.removeItem("arkbot-admin-chat")
  }, [])

  const {
    messages,
    input,
    setInput,
    isLoading,
    historyError,
    copiedId,
    selectedFiles,
    removeFile,
    messagesEndRef,
    textareaRef,
    sendMessage,
    handleKeyDown,
    handleCopy,
    handleRegenerate,
    handleNewChat,
    openFilePicker,
    handleDrop,
    handleDragOver,
  } = useChat({
    apiEndpoint: CHAT_API_URL,
    apiKey: CHAT_API_KEY,
    persistence: { kind: "admin", userId },
  })

  const isEmpty = messages.length === 0

  return (
    <div className="flex h-full flex-col bg-background overflow-hidden relative">
      {historyError && (
        <div className="mx-4 mt-3 flex shrink-0 items-center rounded-lg border border-amber-400/25 bg-amber-400/10 px-3 py-2 text-xs text-amber-100/85">
          {historyError} Run the admin chat migration in the Supabase SQL Editor.
        </div>
      )}
      {/* New session button */}
      <button
        onClick={handleNewChat}
        className="fixed top-3 right-3 sm:right-16 z-50 flex items-center justify-center w-10 h-10 rounded-lg bg-white/10 text-white/60 hover:text-white/80 hover:bg-white/15 transition-colors backdrop-blur-sm"
      >
        <Plus className="h-4 w-4" />
      </button>

      {isEmpty ? (
        <div className="flex flex-1 flex-col items-center justify-center px-4 overflow-hidden pt-16">
          <h1 className="mb-10 text-center text-2xl font-light text-white/80">
            Admin Chat
          </h1>
          <div className="w-full max-w-2xl">
            <div
              className="relative"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <div className="absolute -inset-3 rounded-2xl bg-gradient-to-r from-orange-500/20 via-red-500/15 to-orange-400/10 blur-xl" />
              <div className="relative rounded-2xl border border-white/15 bg-background px-2 py-1.5">
                {selectedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 px-2 pt-2 pb-1">
                    {selectedFiles.map((file, i) => (
                      <div
                        key={`${file.name}-${i}`}
                        className="flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 text-xs text-white/70"
                      >
                        <FileText className="h-3 w-3 shrink-0" />
                        <span className="max-w-[100px] truncate">
                          {file.name}
                        </span>
                        <button
                          onClick={() => removeFile(i)}
                          className="ml-0.5 shrink-0 rounded-full p-0.5 hover:bg-white/10"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex items-center">
                  <button
                    type="button"
                    onClick={openFilePicker}
                    className="flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/50 hover:text-white/70 hover:bg-white/5"
                  >
                    <Paperclip className="h-4 w-4" />
                    <span>Add files</span>
                  </button>
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Tanya ArkBot..."
                    rows={1}
                    className="flex-1 resize-none bg-transparent px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none scrollbar-hide"
                  />
                  <Button
                    size="icon"
                    disabled={
                      (!input.trim() && selectedFiles.length === 0) || isLoading
                    }
                    onClick={() => sendMessage(input)}
                    className={cn(
                      "h-9 w-9 shrink-0 rounded-lg !bg-transparent !opacity-100",
                      (input.trim() || selectedFiles.length > 0) && !isLoading
                        ? "!text-white hover:bg-white/10"
                        : "!text-white/30 cursor-not-allowed"
                    )}
                  >
                    <Sparkles className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide pt-16">
            <div className="mx-auto max-w-2xl px-4 py-4 space-y-4">
              {messages.map((msg) => (
                <div key={msg.id}>
                  {msg.role === "user" ? (
                    <div className="flex justify-end">
                      <div className="max-w-[80%] rounded-2xl bg-white/10 px-4 py-2.5 text-sm text-white">
                        {msg.files && msg.files.length > 0 && (
                          <div className="mb-2 flex flex-wrap gap-1.5">
                            {msg.files.map((name, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center gap-1 rounded-lg bg-white/10 px-2 py-0.5 text-xs text-white/70"
                              >
                                <FileText className="h-3 w-3" />
                                {name}
                              </span>
                            ))}
                          </div>
                        )}
                        {msg.content && <span>{msg.content}</span>}
                      </div>
                    </div>
                  ) : (
                    <div className="group/msg flex gap-3">
                      <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10">
                        <Bot className="h-3.5 w-3.5 text-white/60" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="prose prose-invert prose-sm max-w-none text-sm leading-relaxed text-white/90 break-words overflow-wrap-anywhere">
                          <ReactMarkdown>{formatContent(msg.content)}</ReactMarkdown>
                        </div>
                        <div className="mt-1 flex items-center gap-1">
                          <button
                            onClick={() => handleCopy(msg.content, msg.id)}
                            className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs text-white/40 hover:bg-white/5 hover:text-white/60"
                          >
                            {copiedId === msg.id ? (
                              <>
                                <Check className="h-3 w-3" />
                                <span>Tersalin</span>
                              </>
                            ) : (
                              <>
                                <Copy className="h-3 w-3" />
                                <span>Salin</span>
                              </>
                            )}
                          </button>
                          <button
                            onClick={() => handleRegenerate(msg.id)}
                            className="flex items-center gap-1 rounded-full px-2 py-0.5 text-xs text-white/40 hover:bg-white/5 hover:text-white/60"
                          >
                            <RotateCcw className="h-3 w-3" />
                            <span>Ulangi</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/10">
                    <Bot className="h-3.5 w-3.5 text-white/60" />
                  </div>
                  <div className="flex items-center gap-1.5 py-2">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/30" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/30 [animation-delay:0.2s]" />
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-white/30 [animation-delay:0.4s]" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="shrink-0 px-4 pb-3 pt-2 bg-background">
            <div className="mx-auto max-w-2xl">
              <div
                className="relative"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <div className="absolute -inset-3 rounded-2xl bg-gradient-to-r from-orange-500/20 via-red-500/15 to-orange-400/10 blur-xl" />
                <div className="relative rounded-2xl border border-white/15 bg-background px-2 py-1.5">
                  {selectedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 px-2 pt-2 pb-1">
                      {selectedFiles.map((file, i) => (
                        <div
                          key={`${file.name}-${i}`}
                          className="flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 text-xs text-white/70"
                        >
                          <FileText className="h-3 w-3 shrink-0" />
                          <span className="max-w-[100px] truncate">
                            {file.name}
                          </span>
                          <button
                            onClick={() => removeFile(i)}
                            className="ml-0.5 shrink-0 rounded-full p-0.5 hover:bg-white/10"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center">
                    <button
                      type="button"
                      onClick={openFilePicker}
                      className="flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/50 hover:text-white/70 hover:bg-white/5"
                    >
                      <Paperclip className="h-4 w-4" />
                      <span>Add files</span>
                    </button>
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Tanya ArkBot..."
                      rows={1}
                      className="flex-1 resize-none bg-transparent px-3 py-2.5 text-sm text-white placeholder:text-white/30 focus:outline-none scrollbar-hide"
                    />
                    <Button
                      size="icon"
                      disabled={
                        (!input.trim() && selectedFiles.length === 0) ||
                        isLoading
                      }
                      onClick={() => sendMessage(input)}
                      className={cn(
                        "h-9 w-9 shrink-0 rounded-lg !bg-transparent !opacity-100",
                        (input.trim() || selectedFiles.length > 0) && !isLoading
                          ? "!text-white hover:bg-white/10"
                          : "!text-white/30 cursor-not-allowed"
                      )}
                    >
                      <Sparkles className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
