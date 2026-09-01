import { useState, useEffect } from "react"
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
} from "@/components/ui/alert-dialog"
import { Loader2, Trash2, Search, AlertTriangle, Layers, FileText } from "lucide-react"
import { toast } from "sonner"
import { cn } from "@/lib/utils"

interface OrphanChunk {
  id: string
  content: string
  metadata: Record<string, any> | null
  created_at: string
}

interface OrphanChunksProps {
  onCount?: (count: number) => void
}

const PAGE_SIZE = 10

export function OrphanChunks({ onCount }: OrphanChunksProps) {
  const [chunks, setChunks] = useState<OrphanChunk[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(0)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const fetchChunks = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .or("metadata->>file_name.is.null,metadata->>file_name.eq.,metadata->>drive_file_id.is.null,metadata->>drive_file_id.eq.")
      .order("created_at", { ascending: false })

    if (!error && data) {
      setChunks(data as OrphanChunk[])
      onCount?.(data.length)
    }
    setLoading(false)
  }

  const handleDelete = async () => {
    if (selectedIds.size === 0) return
    setDeleting(true)
    setDeleteDialogOpen(false)

    const { error } = await supabase
      .from("documents")
      .delete()
      .in("id", Array.from(selectedIds))

    if (!error) {
      setChunks(prev => {
        const next = prev.filter(c => !selectedIds.has(c.id))
        onCount?.(next.length)
        return next
      })
      toast.success(`${selectedIds.size} chunk berhasil dihapus`)
    } else {
      toast.error("Gagal menghapus chunk")
    }
    setSelectedIds(new Set())
    setDeleting(false)
  }

  useEffect(() => {
    fetchChunks()
  }, [])

  const filteredChunks = chunks.filter(c => {
    if (!search) return true
    const q = search.toLowerCase()
    const fileName = c.metadata?.file_name || ""
    const driveFileId = c.metadata?.drive_file_id || ""
    return c.content?.toLowerCase().includes(q) ||
           fileName.toLowerCase().includes(q) ||
           driveFileId.toLowerCase().includes(q)
  })

  const totalPages = Math.ceil(filteredChunks.length / PAGE_SIZE)
  const pagedChunks = filteredChunks.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleSelectAll = () => {
    if (selectedIds.size === pagedChunks.length && pagedChunks.length > 0) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(pagedChunks.map(c => c.id)))
    }
  }

  const getFileName = (chunk: OrphanChunk) => chunk.metadata?.file_name || "—"
  const getDriveFileId = (chunk: OrphanChunk) => chunk.metadata?.drive_file_id || ""
  const isOrphan = (chunk: OrphanChunk) => !chunk.metadata?.drive_file_id

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-6 w-6 animate-spin text-white/40" />
      </div>
    )
  }

  if (chunks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Layers className="mb-3 h-10 w-10 text-white/15" />
        <p className="text-sm text-white/30">Tidak ada orphan chunks</p>
        <p className="mt-1 text-xs text-white/20">Semua chunk punya file_name dan drive_file_id</p>
      </div>
    )
  }

  return (
    <>
      {/* Header */}
      <div className="mb-4 flex items-center gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0) }}
            placeholder="Search by content, file name, or drive ID..."
            className="w-full rounded-xl border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-sm text-white placeholder:text-white/30 outline-none focus:border-white/25 transition-colors"
          />
        </div>
        {selectedIds.size > 0 && (
          <Button
            onClick={() => setDeleteDialogOpen(true)}
            disabled={deleting}
            className="shrink-0 bg-red-600 text-white hover:bg-red-700"
          >
            {deleting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Trash2 className="mr-2 h-4 w-4" />
            )}
            Hapus ({selectedIds.size})
          </Button>
        )}
      </div>

      {/* Table */}
      <div className="rounded-xl border border-white/[0.06] overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="border-b border-white/[0.06] bg-white/[0.02]">
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectedIds.size === pagedChunks.length && pagedChunks.length > 0}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-white/20 bg-white/5 accent-orange-500"
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/40">
                  File Name
                </th>
                <th className="hidden md:table-cell px-4 py-3 text-left text-xs font-medium text-white/40">
                  Drive File ID
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-white/40">
                  Content
                </th>
                <th className="hidden lg:table-cell px-4 py-3 text-left text-xs font-medium text-white/40">
                  Status
                </th>
              </tr>
            </thead>
            <tbody>
              {pagedChunks.map((chunk) => {
                const orphan = isOrphan(chunk)
                const fileName = getFileName(chunk)
                const driveId = getDriveFileId(chunk)
                return (
                  <tr
                    key={chunk.id}
                    className={cn(
                      "border-b border-white/[0.04] hover:bg-white/[0.02] transition-colors",
                      selectedIds.has(chunk.id) && "bg-white/[0.04]",
                      orphan && "bg-amber-500/[0.02]"
                    )}
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedIds.has(chunk.id)}
                        onChange={() => toggleSelect(chunk.id)}
                        className="h-4 w-4 rounded border-white/20 bg-white/5 accent-orange-500"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-white/30" />
                        <span className="truncate text-sm text-white/80 max-w-[200px]">
                          {fileName}
                        </span>
                      </div>
                    </td>
                    <td className="hidden md:table-cell px-4 py-3">
                      <span className={cn(
                        "font-mono text-xs",
                        driveId ? "text-white/40" : "text-white/20 italic"
                      )}>
                        {driveId || "—"}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-sm text-white/60 max-w-[300px] truncate">
                        {chunk.content?.slice(0, 120) || "(empty)"}
                      </p>
                    </td>
                    <td className="hidden lg:table-cell px-4 py-3">
                      {orphan ? (
                        <span className="inline-flex items-center gap-1 rounded-md border border-amber-500/20 bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                          <AlertTriangle className="h-2.5 w-2.5" />
                          tanpa drive ID
                        </span>
                      ) : (
                        <span className="text-[10px] text-white/30">OK</span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {filteredChunks.length > 0 && (
        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-white/30">
            Showing {page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filteredChunks.length)} of {filteredChunks.length}
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-white/50 hover:text-white/70 hover:bg-white/5"
              disabled={page === 0}
              onClick={() => setPage(p => p - 1)}
            >
              Previous
            </Button>
            <span className="text-xs text-white/40">
              Page {page + 1} of {totalPages}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 text-xs text-white/50 hover:text-white/70 hover:bg-white/5"
              disabled={(page + 1) * PAGE_SIZE >= filteredChunks.length}
              onClick={() => setPage(p => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Delete Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => {
        if (!open) setDeleteDialogOpen(false)
      }}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Hapus {selectedIds.size} chunks?</AlertDialogTitle>
            <AlertDialogDescription>
              Chunk-chunk ini akan dihapus permanen dari database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Batal</AlertDialogCancel>
            <Button
              onClick={handleDelete}
              disabled={deleting}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Hapus
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
