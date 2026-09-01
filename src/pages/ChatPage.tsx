import { useEffect } from "react"
import ReactMarkdown from "react-markdown"
import {
  Bot,
  Copy,
  RotateCcw,
  Check,
  Sparkles,
  Paperclip,
  X,
  FileText,
  Settings,
  Plus,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useChat, Message } from "@/hooks/useChat"

const CHAT_API_URL =
  "https://arkbot-n8n.6jkqbm.easypanel.host/webhook/chat-widget"
const CHAT_API_KEY = import.meta.env.VITE_CHAT_API_KEY || ""

function formatContent(text: string) {
  return text.replace(
    /(https?:\/\/[^\s<>")\]]+)/g,
    "[$1]($1)"
  )
}

export function ChatPage() {
  useEffect(() => {
    // Remove the old cross-window cache after moving public chat to sessionStorage.
    localStorage.removeItem("arkbot-chat")
  }, [])

  const {
    messages,
    input,
    setInput,
    isLoading,
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
    persistence: { kind: "session", storageKey: "arkbot-chat" },
    emptyReplyMessage: "Maaf, tidak ada jawaban yang diterima.",
    errorMessage: "Maaf, terjadi kesalahan saat menghubungi server. Silakan coba lagi.",
  })

  const isEmpty = messages.length === 0

  return (
    <div className="flex h-screen flex-col bg-background overflow-hidden">
      {/* Admin button */}
      <a
        href="/admin"
        className="fixed top-3 left-3 z-50 flex items-center gap-2 rounded-lg bg-white/10 px-3 py-2 text-sm text-white/60 hover:text-white/80 hover:bg-white/15 transition-colors backdrop-blur-sm"
      >
        <Settings className="h-4 w-4" />
      </a>

      {/* New session button */}
      {!isEmpty && (
        <button
          onClick={handleNewChat}
          className="fixed top-3 right-3 z-50 flex items-center justify-center w-10 h-10 rounded-lg bg-white/10 text-white/60 hover:text-white/80 hover:bg-white/15 transition-colors backdrop-blur-sm"
        >
          <Plus className="h-4 w-4" />
        </button>
      )}

      {isEmpty ? (
        <div className="flex flex-1 flex-col items-center justify-center px-4 overflow-hidden pt-16">
          <h1 className="mb-10 text-center text-3xl font-light text-white/80 sm:text-4xl">
            Siap Anda gunakan kapan saja
          </h1>

          <div className="w-full max-w-3xl">
            <div
              className="relative"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
            >
              <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-orange-500/25 via-red-500/20 to-orange-400/15 blur-2xl" />
              <div className="relative rounded-2xl border border-white/15 bg-background px-2 py-1.5 transition-colors focus-within:border-white/25">
                {selectedFiles.length > 0 && (
                  <div className="flex flex-wrap gap-2 px-2 pt-2 pb-1">
                    {selectedFiles.map((file, i) => (
                      <div
                        key={`${file.name}-${i}`}
                        className="flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 text-xs text-white/70"
                      >
                        <FileText className="h-3 w-3 shrink-0" />
                        <span className="max-w-[120px] truncate">
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
                    <span className="hidden sm:inline">Add files</span>
                  </button>
                  <textarea
                    ref={textareaRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Tanya ArkBot..."
                    rows={1}
                    className="flex-1 resize-none bg-transparent px-3 py-2.5 text-[15px] text-white placeholder:text-white/30 focus:outline-none leading-relaxed scrollbar-hide"
                  />
                  <Button
                    size="icon"
                    disabled={
                      (!input.trim() && selectedFiles.length === 0) ||
                      isLoading
                    }
                    onClick={() => sendMessage(input)}
                    className={cn(
                      "h-10 w-10 shrink-0 rounded-lg transition-colors !bg-transparent !opacity-100",
                      (input.trim() || selectedFiles.length > 0) && !isLoading
                        ? "!text-white hover:bg-white/10"
                        : "!text-white/30 cursor-not-allowed"
                    )}
                  >
                    <Sparkles className="h-5 w-5" />
                  </Button>
                </div>
              </div>
            </div>
            <p className="mt-2 text-center text-xs text-white/20">
              ArkBot dapat membuat kesalahan. Pastikan informasi yang diberikan
              sudah benar.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="flex-1 min-h-0 overflow-y-auto bg-background scrollbar-hide pt-16">
            <div className="mx-auto max-w-3xl px-4 py-6 space-y-6">
              {messages.map((msg) => (
                <MessageBubble
                  key={msg.id}
                  message={msg}
                  onCopy={handleCopy}
                  onRegenerate={
                    msg.role === "assistant"
                      ? () => handleRegenerate(msg.id)
                      : undefined
                  }
                  copiedId={copiedId}
                />
              ))}
              {isLoading && <TypingIndicator />}
              <div ref={messagesEndRef} />
            </div>
          </div>

          <div className="shrink-0 px-4 pb-4 pt-2 bg-background">
            <div className="mx-auto max-w-3xl">
              <div
                className="relative"
                onDrop={handleDrop}
                onDragOver={handleDragOver}
              >
                <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-orange-500/25 via-red-500/20 to-orange-400/15 blur-2xl" />
                <div className="relative rounded-2xl border border-white/15 bg-background px-2 py-1.5 transition-colors focus-within:border-white/25">
                  {selectedFiles.length > 0 && (
                    <div className="flex flex-wrap gap-2 px-2 pt-2 pb-1">
                      {selectedFiles.map((file, i) => (
                        <div
                          key={`${file.name}-${i}`}
                          className="flex items-center gap-1.5 rounded-lg bg-white/10 px-2.5 py-1 text-xs text-white/70"
                        >
                          <FileText className="h-3 w-3 shrink-0" />
                          <span className="max-w-[120px] truncate">
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
                      className="flex shrink-0 items-center gap-2 rounded-xl px-3 py-2 text-sm text-white/50 transition-colors hover:bg-white/5 hover:text-white/70"
                    >
                      <Paperclip className="h-4 w-4" />
                      <span className="hidden sm:inline">Add files</span>
                    </button>
                    <textarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Tanya ArkBot..."
                      rows={1}
                      className="flex-1 resize-none bg-transparent px-3 py-2.5 text-[15px] text-white placeholder:text-white/30 focus:outline-none leading-relaxed scrollbar-hide"
                    />
                    <Button
                      size="icon"
                      disabled={
                        (!input.trim() && selectedFiles.length === 0) ||
                        isLoading
                      }
                      onClick={() => sendMessage(input)}
                      className={cn(
                        "h-10 w-10 shrink-0 rounded-lg transition-colors !bg-transparent !opacity-100",
                        (input.trim() || selectedFiles.length > 0) && !isLoading
                          ? "!text-white hover:bg-white/10"
                          : "!text-white/30 cursor-not-allowed"
                      )}
                    >
                      <Sparkles className="h-5 w-5" />
                    </Button>
                  </div>
                </div>
              </div>
              <p className="mt-2 text-center text-xs text-white/20">
                ArkBot dapat membuat kesalahan. Pastikan informasi yang diberikan
                sudah benar.
              </p>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function MessageBubble({
  message,
  onCopy,
  onRegenerate,
  copiedId,
}: {
  message: Message
  onCopy: (text: string, id: string) => void
  onRegenerate?: () => void
  copiedId: string | null
}) {
  const isUser = message.role === "user"

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-3xl bg-white/10 px-5 py-3 text-[15px] text-white leading-relaxed">
          {message.files && message.files.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {message.files.map((name, i) => (
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
          {message.content && <span>{message.content}</span>}
        </div>
      </div>
    )
  }

  return (
    <div className="group/msg flex gap-3">
      <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10">
        <Bot className="h-4 w-4 text-white/60" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="prose prose-invert prose-sm max-w-none leading-relaxed text-white/90 break-words overflow-wrap-anywhere">
          <ReactMarkdown>{formatContent(message.content)}</ReactMarkdown>
        </div>
        <div className="mt-2 flex items-center gap-1">
          <button
            onClick={() => onCopy(message.content, message.id)}
            className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-white/40 transition-colors hover:bg-white/5 hover:text-white/60"
          >
            {copiedId === message.id ? (
              <>
                <Check className="h-3 w-3" />
                Tersalin
              </>
            ) : (
              <>
                <Copy className="h-3 w-3" />
                Salin
              </>
            )}
          </button>
          {onRegenerate && (
            <button
              onClick={onRegenerate}
              className="flex items-center gap-1 rounded-full px-2.5 py-1 text-xs text-white/40 transition-colors hover:bg-white/5 hover:text-white/60"
            >
              <RotateCcw className="h-3 w-3" />
              Ulangi
            </button>
          )}
        </div>
      </div>
    </div>
  )
}

function TypingIndicator() {
  return (
    <div className="flex gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/10">
        <Bot className="h-4 w-4 text-white/60" />
      </div>
      <div className="flex items-center gap-1.5 py-3">
        <span className="h-2 w-2 animate-pulse rounded-full bg-white/30" />
        <span className="h-2 w-2 animate-pulse rounded-full bg-white/30 [animation-delay:0.2s]" />
        <span className="h-2 w-2 animate-pulse rounded-full bg-white/30 [animation-delay:0.4s]" />
      </div>
    </div>
  )
}
