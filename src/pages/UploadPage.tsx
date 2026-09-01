import { useState, useRef } from "react"
import { v4 as uuidv4 } from "uuid"
import {
  Upload,
  FileText,
  X,
  CheckCircle,
  Loader2,
  AlertCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { FolderSelector } from "@/components/drive/FolderSelector"

const UPLOAD_URL =
  "https://arkbot-n8n.6jkqbm.easypanel.host/webhook/web-upload"

const ALLOWED_EXTENSIONS = [".pdf", ".docx", ".xlsx", ".md"]

interface UploadItem {
  id: string
  file: File
  status: "pending" | "uploading" | "success" | "error"
  message?: string
}

export function UploadPage() {
  const [items, setItems] = useState<UploadItem[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const addFiles = (files: FileList | null) => {
    if (!files) return
    const newItems: UploadItem[] = []

    Array.from(files).forEach((file) => {
      const ext = "." + file.name.split(".").pop()?.toLowerCase()
      if (!ALLOWED_EXTENSIONS.includes(ext)) {
        toast.error(`Format ${ext} tidak didukung: ${file.name}`)
        return
      }
      if (file.size === 0) {
        toast.error(`File kosong: ${file.name}`)
        return
      }
      newItems.push({ id: uuidv4(), file, status: "pending" })
    })

    setItems((prev) => [...prev, ...newItems])
  }

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id))
  }

  const uploadAll = async () => {
    const pending = items.filter((item) => item.status === "pending")
    if (pending.length === 0) return

    setUploading(true)
    setUploadProgress({ current: 0, total: pending.length })

    let batchSuccess = 0
    let batchFailed = 0
    const failedFiles: string[] = []

    for (let idx = 0; idx < pending.length; idx++) {
      const item = pending[idx]
      setUploadProgress({ current: idx + 1, total: pending.length })
      setItems((prev) =>
        prev.map((i) =>
          i.id === item.id ? { ...i, status: "uploading" } : i
        )
      )

      try {
        const formData = new FormData()
        formData.append("file", item.file)
        if (selectedFolderId) {
          formData.append("folder_id", selectedFolderId)
        }

        const res = await fetch(UPLOAD_URL, {
          method: "POST",
          body: formData,
          signal: AbortSignal.timeout(60000),
        })

        if (!res.ok) {
          let errorMsg = `HTTP ${res.status}`
          try {
            const errorBody = await res.json()
            if (errorBody.message || errorBody.error) {
              errorMsg = errorBody.message || errorBody.error
            }
          } catch {}
          throw new Error(errorMsg)
        }

        const data = await res.json().catch(() => ({}))

        const hasError =
          data.status === "error" ||
          data.status === "failed" ||
          data.success === false ||
          data.error ||
          data.error_message ||
          data.err ||
          (typeof data.message === "string" && (
            data.message.toLowerCase().includes("error") ||
            data.message.toLowerCase().includes("gagal") ||
            data.message.toLowerCase().includes("fail")
          ))

        if (hasError) {
          const errorMsg = data.error || data.message || data.error_message || data.err || "Workflow error"
          throw new Error(typeof errorMsg === "string" ? errorMsg : "Workflow error")
        }

        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id ? { ...i, status: "success" } : i
          )
        )
        toast.success(`${item.file.name} berhasil diupload`)
        batchSuccess++
      } catch (err) {
        let message = "Upload failed"
        if (err instanceof TypeError && err.message.includes("fetch")) {
          message = "Server tidak dapat dijangkau"
        } else if (err instanceof DOMException && err.name === "TimeoutError") {
          message = "Timeout - server tidak merespon"
        } else if (err instanceof Error) {
          message = err.message
        }

        setItems((prev) =>
          prev.map((i) =>
            i.id === item.id
              ? { ...i, status: "error", message }
              : i
          )
        )
        failedFiles.push(item.file.name)
        toast.error(`Gagal: ${item.file.name} - ${message}`)
        batchFailed++
      }
    }

    setUploadProgress({ current: 0, total: 0 })
    setUploading(false)

    if (batchSuccess > 0 && batchFailed === 0) {
      toast.success(`Semua ${batchSuccess} file berhasil diupload`)
    } else if (batchFailed > 0 && batchSuccess === 0) {
      toast.error(`Semua ${batchFailed} file gagal diupload`)
    } else if (batchFailed > 0) {
      toast.warning(`${batchSuccess} berhasil, ${batchFailed} gagal: ${failedFiles.slice(0, 3).join(", ")}${failedFiles.length > 3 ? ` dan ${failedFiles.length - 3} lainnya` : ""}`)
    }
  }

  const clearCompleted = () => {
    setItems((prev) => prev.filter((item) => item.status !== "success"))
  }

  const pendingCount = items.filter((i) => i.status === "pending").length
  const successCount = items.filter((i) => i.status === "success").length

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Upload Files</h1>
          <p className="mt-1 text-sm text-white/40">
            Upload files to Google Drive via n8n workflow
          </p>
        </div>
        <div className="flex items-center gap-2">
          {uploading && uploadProgress.total > 0 && (
            <span className="text-sm text-orange-400 font-medium">
              {uploadProgress.current}/{uploadProgress.total}
            </span>
          )}
          {items.length > 0 && (
            <>
              {successCount > 0 && !uploading && (
                <Button
                  variant="ghost"
                  onClick={clearCompleted}
                  className="rounded-xl text-sm text-white/40 hover:text-white/60"
                >
                  Clear completed
                </Button>
              )}
              <Button
                disabled={pendingCount === 0 || uploading}
                onClick={uploadAll}
                className={cn(
                  "rounded-xl px-4 py-2 text-sm font-medium transition-colors",
                  pendingCount > 0 && !uploading
                    ? "bg-orange-500 text-white hover:bg-orange-400"
                    : "bg-white/5 text-white/30 cursor-not-allowed"
                )}
              >
                {uploading ? (
                  <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
                ) : (
                  <Upload className="mr-2 inline h-4 w-4" />
                )}
                Upload{pendingCount > 0 ? ` (${pendingCount})` : ""}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Folder Selector */}
      <div className="mb-4">
        <FolderSelector value={selectedFolderId} onChange={setSelectedFolderId} />
      </div>

      {/* Drop zone */}
      <div
        onClick={() => fileInputRef.current?.click()}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          addFiles(e.dataTransfer.files)
        }}
        className="mb-6 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-white/10 bg-white/[0.02] py-16 transition-colors hover:border-orange-500/30 hover:bg-orange-500/[0.02]"
      >
        <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-orange-500/10">
          <Upload className="h-6 w-6 text-orange-500" />
        </div>
        <p className="text-sm font-medium text-white/60">
          Click or drag & drop files here
        </p>
        <p className="mt-1 text-xs text-white/30">
          PDF, DOCX, XLSX, MD
        </p>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={(e) => {
          addFiles(e.target.files)
          e.target.value = ""
        }}
      />

      {/* File list */}
      {items.length > 0 && (
        <div className="rounded-xl border border-white/[0.06] overflow-hidden">
          <div className="max-h-[50vh] overflow-y-auto">
            <table className="w-full">
              <thead className="sticky top-0 bg-[#131314] z-10">
                <tr className="border-b border-white/[0.06]">
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/40">
                    File
                  </th>
                  <th className="hidden sm:table-cell px-4 py-3 text-left text-xs font-medium text-white/40">
                    Size
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-white/40">
                    Status
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-white/40">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <tr
                    key={item.id}
                    className="border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5">
                          <FileText className="h-4 w-4 text-white/30" />
                        </div>
                        <span className="truncate text-sm text-white/80 max-w-[200px] sm:max-w-[300px]">
                          {item.file.name}
                        </span>
                      </div>
                    </td>
                    <td className="hidden sm:table-cell px-4 py-3 text-sm text-white/40">
                      {(item.file.size / 1024).toFixed(1)} KB
                    </td>
                    <td className="px-4 py-3">
                      {item.status === "pending" && (
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-amber-500/20 bg-amber-500/15 px-2 py-0.5 text-xs font-medium text-amber-400">
                          Pending
                        </span>
                      )}
                      {item.status === "uploading" && (
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-orange-500/20 bg-orange-500/15 px-2 py-0.5 text-xs font-medium text-orange-400">
                          <Loader2 className="h-3 w-3 animate-spin" />
                          Uploading
                        </span>
                      )}
                      {item.status === "success" && (
                        <span className="inline-flex items-center gap-1.5 rounded-md border border-green-500/20 bg-green-500/15 px-2 py-0.5 text-xs font-medium text-green-400">
                          <CheckCircle className="h-3 w-3" />
                          Berhasil
                        </span>
                      )}
                      {item.status === "error" && (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1.5 rounded-md border border-red-500/20 bg-red-500/15 px-2 py-0.5 text-xs font-medium text-red-400">
                            <AlertCircle className="h-3 w-3" />
                            Gagal
                          </span>
                          <p className="text-xs text-red-400/80 max-w-[200px] truncate" title={item.message}>
                            {item.message}
                          </p>
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {item.status === "pending" && (
                        <button
                          onClick={() => removeItem(item.id)}
                          className="rounded-lg p-1.5 text-white/30 hover:bg-white/5 hover:text-white/60"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Summary */}
          {items.length > 0 && (
            <div className="mt-3 flex items-center gap-4 text-xs text-white/40">
              <span>Total: {items.length} file</span>
              {items.filter((i) => i.status === "success").length > 0 && (
                <span className="text-green-400/70">
                  {items.filter((i) => i.status === "success").length} berhasil
                </span>
              )}
              {items.filter((i) => i.status === "error").length > 0 && (
                <span className="text-red-400/70">
                  {items.filter((i) => i.status === "error").length} gagal
                </span>
              )}
              {items.filter((i) => i.status === "pending").length > 0 && (
                <span className="text-amber-400/70">
                  {items.filter((i) => i.status === "pending").length} pending
                </span>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
