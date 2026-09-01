import { useState, useEffect, useRef } from "react"
import { supabase } from "@/lib/supabase"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import {
  Loader2,
  Trash2,
  Search,
  FileText,
  RefreshCw,
  CheckCircle,
  AlertCircle,
  Clock,
  Eye,
  ExternalLink,
  Download,
  Layers,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import type { RealtimeChannel } from "@supabase/supabase-js"
import { DriveManager } from "@/components/drive/DriveManager"
import { OrphanChunks } from "@/components/drive/OrphanChunks"
import { N8N_DRIVE_MANAGER_URL } from "@/components/drive/types"

const N8N_DELETE_FILE_URL =
  "https://arkbot-n8n.6jkqbm.easypanel.host/webhook/delete-drive"

interface DriveFile {
  id: string
  drive_file_id: string
  file_name: string
  last_modified_time: string
  last_synced_at: string
  status: string
}

export function DocumentsPage() {
  const [files, setFiles] = useState<DriveFile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [deleting, setDeleting] = useState<string | null>(null)
  const [previewFile, setPreviewFile] = useState<DriveFile | null>(null)
  const channelRef = useRef<RealtimeChannel | null>(null)
  const [page, setPage] = useState(0)
  const [totalCount, setTotalCount] = useState(0)
  const pageSize = 10
  const [chunksFile, setChunksFile] = useState<DriveFile | null>(null)
  const [chunksLoading, setChunksLoading] = useState(false)
  const [chunksData, setChunksData] = useState<any[]>([])
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkDeleteDrive, setBulkDeleteDrive] = useState(false)
  const [bulkDeleteDialogOpen, setBulkDeleteDialogOpen] = useState(false)
  const [deleteFromDrive, setDeleteFromDrive] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<DriveFile | null>(null)
  const [activeTab, setActiveTab] = useState<"database" | "drive" | "orphans">("database")
  const [driveCount, setDriveCount] = useState(0)
  const [orphanCount, setOrphanCount] = useState(0)
  const [driveFileIds, setDriveFileIds] = useState<Set<string>>(new Set())
  const [showWithoutDrive, setShowWithoutDrive] = useState(false)
  const [totalCountAll, setTotalCountAll] = useState(0)

  const fetchTotalCount = async () => {
    const { count } = await supabase
      .from("drive_file_sync")
      .select("id", { count: "exact", head: true })
    setTotalCountAll(count ?? 0)
  }

  const fetchFiles = async () => {
    setLoading(true)

    let query = supabase
      .from("drive_file_sync")
      .select("*", { count: "exact" })
      .order("last_synced_at", { ascending: false })

    if (search) {
      const q = `%${search}%`
      query = query.or(`file_name.ilike.${q},drive_file_id.ilike.${q}`)
    }

    if (!showWithoutDrive) {
      const from = page * pageSize
      const to = from + pageSize - 1
      query = query.range(from, to)
    }

    const { data, error, count } = await query

    if (!error && data) {
      setFiles(data)
      setTotalCount(count ?? 0)
    }
    setLoading(false)
  }

  const [allDatabaseFileIds, setAllDatabaseFileIds] = useState<Set<string>>(new Set())

  const fetchAllDatabaseFileIds = async () => {
    const { data } = await supabase
      .from("drive_file_sync")
      .select("drive_file_id")
    if (data) {
      setAllDatabaseFileIds(new Set(data.map(f => f.drive_file_id).filter(Boolean)))
    }
  }

  const fetchDriveFileIds = async () => {
    try {
      const res = await fetch(N8N_DRIVE_MANAGER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "list" }),
        signal: AbortSignal.timeout(120000),
      })
      if (!res.ok) return
      const data = await res.json()
      const ids = (data.files || []).map((f: any) => f.id)
      setDriveFileIds(new Set(ids))
    } catch {}
  }

  useEffect(() => {
    fetchFiles()
    fetchTotalCount()
    fetchAllDatabaseFileIds()
    fetchDriveFileIds()
  }, [page, search, showWithoutDrive])

  // Supabase Realtime subscription
  useEffect(() => {
    const channel = supabase
      .channel("drive_file_sync_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "drive_file_sync" },
        (payload) => {
          const { eventType, new: newRow, old: oldRow } = payload

          if (eventType === "INSERT" && newRow) {
            setFiles((prev) => {
              if (prev.some((f) => f.id === newRow.id)) return prev
              return [newRow as DriveFile, ...prev]
            })
          } else if (eventType === "UPDATE" && newRow) {
            setFiles((prev) =>
              prev.map((f) => (f.id === newRow.id ? (newRow as DriveFile) : f))
            )
          } else if (eventType === "DELETE" && oldRow) {
            setFiles((prev) => prev.filter((f) => f.id !== oldRow.id))
          }
        }
      )
      .subscribe(() => {})

    channelRef.current = channel

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [])

  const handleSearchChange = (value: string) => {
    setSearch(value)
    setPage(0)
  }

  const handleDelete = async (id: string) => {
    setDeleting(id)

    // Get the drive_file_id before deleting
    const file = files.find((f) => f.id === id)
    if (file) {
      // Delete from Google Drive via n8n if requested
      if (deleteFromDrive && file.drive_file_id && N8N_DELETE_FILE_URL) {
        try {
          const res = await fetch(N8N_DELETE_FILE_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ drive_file_id: file.drive_file_id }),
            signal: AbortSignal.timeout(120000),
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
          if (data.status === "error" || data.error) {
            throw new Error(data.message || data.error || "Gagal menghapus file dari Drive")
          }
        } catch (err) {
          let message = "Gagal menghapus file dari Google Drive"
          if (err instanceof DOMException && err.name === "TimeoutError") {
            message = "Timeout: Server tidak merespon"
          } else if (err instanceof Error) {
            message = err.message
          }
          toast.error(message)
        }
      }

      // Delete related documents (drive_file_id is in metadata JSONB)
      const { error: docError } = await supabase
        .from("documents")
        .delete()
        .filter("metadata->>drive_file_id", "eq", file.drive_file_id)
      
      if (docError) {
        console.error("Error deleting documents:", docError)
      }
    }

    // Delete from drive_file_sync
    const { error } = await supabase
      .from("drive_file_sync")
      .delete()
      .eq("id", id)

    if (!error) {
      setFiles((prev) => prev.filter((f) => f.id !== id))
      toast.success("File berhasil dihapus")
    } else {
      toast.error("Gagal menghapus file")
    }
    setDeleting(null)
    setDeleteFromDrive(false)
    setDeleteDialogOpen(false)
    setDeleteTarget(null)
  }

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === files.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(files.map((f) => f.id)))
    }
  }

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return
    setDeleting("bulk")
    setBulkDeleteDialogOpen(false)

    let successCount = 0
    let failCount = 0

    for (const id of selectedIds) {
      const file = files.find((f) => f.id === id)
      if (file && bulkDeleteDrive && N8N_DELETE_FILE_URL) {
        try {
          const res = await fetch(N8N_DELETE_FILE_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ drive_file_id: file.drive_file_id }),
            signal: AbortSignal.timeout(120000),
          })
          if (!res.ok) failCount++
        } catch {
          failCount++
        }
      }

      await supabase
        .from("documents")
        .delete()
        .filter("metadata->>drive_file_id", "eq", file?.drive_file_id || "")

      await supabase.from("drive_file_sync").delete().eq("id", id)
      successCount++
    }

    setFiles((prev) => prev.filter((f) => !selectedIds.has(f.id)))
    if (failCount > 0) {
      toast.error(`${failCount} file gagal dihapus dari Google Drive`)
    }
    toast.success(`${successCount} file berhasil dihapus dari database`)
    setSelectedIds(new Set())
    setBulkDeleteDrive(false)
    setDeleting(null)
  }

  const fetchChunks = async (file: DriveFile) => {
    setChunksFile(file)
    setChunksLoading(true)
    setChunksData([])
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .filter("metadata->>drive_file_id", "eq", file.drive_file_id)
    if (!error && data) {
      setChunksData(data)
    }
    setChunksLoading(false)
  }

  const formatDate = (date: string) => {
    if (!date) return " - "
    return new Date(date).toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  const statusIcon = (status: string) => {
    switch (status) {
      case "synced":
        return <CheckCircle className="h-3.5 w-3.5" />
      case "error":
        return <AlertCircle className="h-3.5 w-3.5" />
      default:
        return <Clock className="h-3.5 w-3.5" />
    }
  }

  const statusColor = (status: string) => {
    switch (status) {
      case "synced":
        return "bg-green-500/15 text-green-400 border-green-500/20"
      case "error":
        return "bg-red-500/15 text-red-400 border-red-500/20"
      default:
        return "bg-amber-500/15 text-amber-400 border-amber-500/20"
    }
  }

  return (
    <div className="p-4 sm:p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Documents</h1>
          <p className="mt-1 text-sm text-white/40">
            {activeTab === "database" ? totalCountAll + " file di database" : activeTab === "drive" ? driveCount + " file di Google Drive" : orphanCount + " orphan chunks"}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {activeTab === "database" && selectedIds.size > 0 && (
            <Button
              onClick={() => setBulkDeleteDialogOpen(true)}
              disabled={deleting === "bulk"}
              className="bg-red-600 text-white hover:bg-red-700"
            >
              {deleting === "bulk" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="mr-2 h-4 w-4" />
              )}
              Hapus ({selectedIds.size})
            </Button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-4 flex gap-2 border-b border-white/[0.06] pb-2">
        <button
          onClick={() => setActiveTab("database")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "database"
              ? "bg-white/10 text-white"
              : "text-white/40 hover:bg-white/5 hover:text-white/60"
          )}
        >
          <FileText className="h-4 w-4" />
          Database
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">
            {totalCount}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("drive")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "drive"
              ? "bg-white/10 text-white"
              : "text-white/40 hover:bg-white/5 hover:text-white/60"
          )}
        >
          <ExternalLink className="h-4 w-4" />
          Google Drive
          <span className="rounded-full bg-white/10 px-2 py-0.5 text-xs">
            {driveCount}
          </span>
        </button>
        <button
          onClick={() => setActiveTab("orphans")}
          className={cn(
            "flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors",
            activeTab === "orphans"
              ? "bg-white/10 text-white"
              : "text-white/40 hover:bg-white/5 hover:text-white/60"
          )}
        >
          <Layers className="h-4 w-4" />
          Orphan Chunks
          <span className={cn(
            "rounded-full px-2 py-0.5 text-xs",
            orphanCount > 0 ? "bg-amber-500/15 text-amber-400" : "bg-white/10"
          )}>
            {orphanCount}
          </span>
        </button>
      </div>

            {activeTab === "database" && (() => {
              const displayedFiles = showWithoutDrive
                ? files.filter(f => f.drive_file_id && !driveFileIds.has(f.drive_file_id))
                : files
              const withoutDriveCount = [...allDatabaseFileIds].filter(id => !driveFileIds.has(id)).length
              return (
        <>
          {/* Search + Filter */}
          <div className="mb-4 flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
              <input
                type="text"
                value={search}
                onChange={(e) => handleSearchChange(e.target.value)}
                placeholder="Search by name..."
                className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/25 transition-colors"
              />
            </div>

            {driveFileIds.size > 0 && withoutDriveCount > 0 && (
              <button
                onClick={() => { setShowWithoutDrive(!showWithoutDrive); setPage(0); setSelectedIds(new Set()) }}
                className={cn(
                  "flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-colors whitespace-nowrap",
                  showWithoutDrive
                    ? "bg-red-500/15 text-red-400 border border-red-500/20"
                    : "text-white/40 hover:bg-white/5 hover:text-white/60 border border-white/10"
                )}
              >
                <AlertCircle className="h-3 w-3" />
                {withoutDriveCount} tanpa Drive
              </button>
            )}

            <Button
              variant="ghost"
              size="icon"
              className="h-9 w-9 shrink-0 text-white/50 hover:text-white/70 hover:bg-white/5"
              onClick={fetchFiles}
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>

          {/* Table */}
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-6 w-6 animate-spin text-white/40" />
            </div>
          ) : displayedFiles.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <FileText className="mb-3 h-10 w-10 text-white/15" />
              <p className="text-sm text-white/30">
                {search || showWithoutDrive
                  ? "No files found"
                  : "No files yet"}
              </p>
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-white/[0.06] overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[600px]">
                    <thead>
                      <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                        <th className="px-4 py-3 text-left">
                          <input
                            type="checkbox"
                            checked={selectedIds.size === displayedFiles.length && displayedFiles.length > 0}
                            onChange={toggleSelectAll}
                            className="h-4 w-4 rounded border-white/20 bg-white/5 accent-orange-500"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white/40">
                          Key
                        </th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-white/40">
                          Status
                        </th>
                        <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-white/40">
                          Last Modified
                        </th>
                        <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-medium text-white/40">
                          Last Synced
                        </th>
                        <th className="px-4 py-3 text-right text-xs font-medium text-white/40">
                          Action
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {displayedFiles.map((file) => {
                        const hasNoDrive = file.drive_file_id && !driveFileIds.has(file.drive_file_id)
                        return (
                        <tr
                          key={file.id}
                          className={cn(
                            "border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors",
                            selectedIds.has(file.id) && "bg-white/[0.04]",
                            hasNoDrive && "bg-red-500/[0.03]"
                          )}
                        >
                          <td className="px-4 py-3">
                            <input
                              type="checkbox"
                              checked={selectedIds.has(file.id)}
                              onChange={() => toggleSelect(file.id)}
                              className="h-4 w-4 rounded border-white/20 bg-white/5 accent-orange-500"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/5">
                                <FileText className="h-4 w-4 text-white/30" />
                              </div>
                              <div className="min-w-0">
                                <p className="truncate text-sm font-medium text-white/90 max-w-[200px] md:max-w-[280px]">
                                  {file.file_name}
                                </p>
                                <p className="truncate text-xs text-white/30 max-w-[200px] md:max-w-[280px]">
                                  {file.drive_file_id}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span
                              className={cn(
                                "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
                                statusColor(file.status)
                              )}
                            >
                              {statusIcon(file.status)}
                              {file.status}
                            </span>
                            {hasNoDrive && (
                              <span className="ml-1.5 inline-flex items-center gap-1 rounded-md border border-red-500/20 bg-red-500/15 px-1.5 py-0.5 text-[10px] font-medium text-red-400">
                                <AlertCircle className="h-2.5 w-2.5" />
                                tanpa Drive
                              </span>
                            )}
                          </td>
                          <td className="hidden md:table-cell px-4 py-3 text-sm text-white/40">
                            {formatDate(file.last_modified_time)}
                          </td>
                          <td className="hidden lg:table-cell px-4 py-3 text-sm text-white/40">
                            {formatDate(file.last_synced_at)}
                          </td>
                          <td className="px-4 py-3 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-white/30 hover:text-blue-400 hover:bg-blue-400/10"
                                onClick={() => setPreviewFile(file)}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-white/30 hover:text-purple-400 hover:bg-purple-400/10"
                                onClick={() => fetchChunks(file)}
                              >
                                <Layers className="h-4 w-4" />
                              </Button>
                              <AlertDialog open={deleteDialogOpen && deleteTarget?.id === file.id} onOpenChange={(open) => {
                                if (!open) {
                                  setDeleteDialogOpen(false)
                                  setDeleteTarget(null)
                                  setDeleteFromDrive(false)
                                }
                              }}>
                                <AlertDialogTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-white/30 hover:text-red-400 hover:bg-red-400/10"
                                    disabled={deleting === file.id}
                                    onClick={() => {
                                      setDeleteTarget(file)
                                      setDeleteDialogOpen(true)
                                    }}
                                  >
                                    {deleting === file.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <Trash2 className="h-4 w-4" />
                                    )}
                                  </Button>
                                </AlertDialogTrigger>
                                <AlertDialogContent>
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Hapus File?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      File ini dan dokumen terkait akan dihapus permanen dari database.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <div className="flex items-center gap-2 py-2">
                                    <input
                                      type="checkbox"
                                      id={`drive-delete-${file.id}`}
                                      checked={deleteFromDrive}
                                      onChange={(e) => setDeleteFromDrive(e.target.checked)}
                                      className="h-4 w-4 rounded border-white/20 bg-white/5 accent-orange-500"
                                    />
                                    <label
                                      htmlFor={`drive-delete-${file.id}`}
                                      className="text-sm text-white/60 cursor-pointer"
                                    >
                                      Hapus juga file dari Google Drive
                                    </label>
                                  </div>
                                  {deleteFromDrive && (
                                    <p className="text-xs text-amber-400/80">
                                      File akan dihapus dari Google Drive dan tidak bisa dikembalikan.
                                    </p>
                                  )}
                                  <AlertDialogFooter>
                                    <AlertDialogCancel>Batal</AlertDialogCancel>
                                    <Button
                                      onClick={() => handleDelete(file.id)}
                                      disabled={deleting === file.id}
                                      className="bg-red-600 hover:bg-red-700"
                                    >
                                      {deleting === file.id ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      ) : null}
                                      Hapus
                                    </Button>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              </AlertDialog>
                            </div>
                          </td>
                        </tr>
                      )})}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              {totalCount > 0 && (
                <div className="mt-4 flex items-center justify-between">
                  <p className="text-xs text-white/30">
                    Showing {page * pageSize + 1}–{Math.min((page + 1) * pageSize, totalCount)} of {totalCount}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-white/50 hover:text-white/70 hover:bg-white/5"
                      disabled={page === 0}
                      onClick={() => setPage((p) => p - 1)}
                    >
                      Previous
                    </Button>
                    <span className="text-xs text-white/40">
                      Page {page + 1} of {Math.ceil(totalCount / pageSize)}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-8 text-xs text-white/50 hover:text-white/70 hover:bg-white/5"
                      disabled={(page + 1) * pageSize >= totalCount}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </>
      )})()}
      {/* Drive Manager Tab */}
      {activeTab === "drive" && <DriveManager onCount={setDriveCount} databaseFileIds={allDatabaseFileIds} onDriveIds={setDriveFileIds} />}

      {/* Orphan Chunks Tab */}
      {activeTab === "orphans" && <OrphanChunks onCount={setOrphanCount} />}

      {/* Preview Dialog */}
      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white">
          <DialogHeader>
            <DialogTitle className="text-white">{previewFile?.file_name}</DialogTitle>
            <DialogDescription className="text-white/50">
              File details from Google Drive
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/40">Drive File ID</span>
                <span className="font-mono text-xs text-white/70">{previewFile?.drive_file_id}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/40">Status</span>
                {previewFile && (
                  <span
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
                      statusColor(previewFile.status)
                    )}
                  >
                    {statusIcon(previewFile.status)}
                    {previewFile.status}
                  </span>
                )}
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/40">Last Modified</span>
                <span className="text-white/70">{formatDate(previewFile?.last_modified_time ?? "")}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-white/40">Last Synced</span>
                <span className="text-white/70">{formatDate(previewFile?.last_synced_at ?? "")}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              className="flex-1 border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
              asChild
            >
              <a
                href={`https://drive.google.com/file/d/${previewFile?.drive_file_id}/view`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="mr-2 h-4 w-4" />
                View in Drive
              </a>
            </Button>
            <Button
              variant="outline"
              className="flex-1 border-white/10 bg-white/5 text-white/70 hover:bg-white/10 hover:text-white"
              asChild
            >
              <a
                href={`https://drive.google.com/uc?id=${previewFile?.drive_file_id}&export=download`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Download className="mr-2 h-4 w-4" />
                Download
              </a>
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Chunks Dialog */}
      <Dialog open={!!chunksFile} onOpenChange={(open) => !open && setChunksFile(null)}>
        <DialogContent className="bg-zinc-900 border-white/10 text-white max-w-2xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center gap-2">
              <Layers className="h-5 w-5 text-purple-400" />
              Chunks - {chunksFile?.file_name}
            </DialogTitle>
            <DialogDescription className="text-white/50">
              RAG document chunks indexed for this file
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto -mx-6 px-6 py-2">
            {chunksLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-5 w-5 animate-spin text-white/40" />
              </div>
            ) : chunksData.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12">
                <Layers className="mb-3 h-8 w-8 text-white/15" />
                <p className="text-sm text-white/30">No chunks indexed yet</p>
              </div>
            ) : (
              <div className="space-y-3">
                {chunksData.map((chunk, idx) => (
                  <div
                    key={chunk.id ?? idx}
                    className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-medium text-purple-400/80">
                        Chunk #{idx + 1}
                      </span>
                      {chunk.metadata?.page_number != null && (
                        <span className="text-xs text-white/30">
                          Page {chunk.metadata.page_number}
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-white/60 whitespace-pre-wrap line-clamp-4">
                      {chunk.content?.slice(0, 200)}
                      {chunk.content?.length > 200 && "..."}
                    </p>
                    {chunk.metadata && Object.keys(chunk.metadata).length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-1.5">
                        {Object.entries(chunk.metadata)
                          .filter(([k]) => k !== "drive_file_id")
                          .slice(0, 5)
                          .map(([key, val]) => (
                            <span
                              key={key}
                              className="inline-flex items-center rounded bg-white/5 px-1.5 py-0.5 text-[10px] text-white/30"
                            >
                              {key}: {String(val)}
                            </span>
                          ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="text-xs text-white/30 pt-2 border-t border-white/[0.06]">
            {chunksData.length} chunk{chunksData.length !== 1 ? "s" : ""} found
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Delete Dialog */}
      <AlertDialog open={bulkDeleteDialogOpen} onOpenChange={(open) => {
        if (!open) {
          setBulkDeleteDialogOpen(false)
          setBulkDeleteDrive(false)
        }
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {selectedIds.size} File?</AlertDialogTitle>
            <AlertDialogDescription>
              File-file ini dan dokumen terkait akan dihapus permanen dari database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex items-center gap-2 py-2">
            <input
              type="checkbox"
              id="bulk-delete-drive"
              checked={bulkDeleteDrive}
              onChange={(e) => setBulkDeleteDrive(e.target.checked)}
              className="h-4 w-4 rounded border-white/20 bg-white/5 accent-orange-500"
            />
            <label
              htmlFor="bulk-delete-drive"
              className="text-sm text-white/60 cursor-pointer"
            >
              Hapus juga file dari Google Drive
            </label>
          </div>
          {bulkDeleteDrive && (
            <p className="text-xs text-amber-400/80">
              File akan dihapus dari Google Drive dan tidak bisa dikembalikan.
            </p>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <Button
              onClick={handleBulkDelete}
              disabled={deleting === "bulk"}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting === "bulk" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Hapus
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      
    </div>
  )
}
