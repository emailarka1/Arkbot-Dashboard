import { useState, useEffect } from "react"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { ChevronDown, Folder, FolderPlus, RefreshCw, Loader2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { toast } from "sonner"
import { N8N_DRIVE_MANAGER_URL, type DriveFolder } from "./types"

interface FolderSelectorProps {
  value: string | null
  onChange: (folderId: string | null) => void
}

const ARKBOT_LIBRARY_ID = "1lKvWCa7FR23qRYL_mBGpQOhs6JI58sxj"
const ARKBOT_LIBRARY_NAME = "Arkbot Library"

export function FolderSelector({ value, onChange }: FolderSelectorProps) {
  const [folders, setFolders] = useState<DriveFolder[]>([])
  const [loading, setLoading] = useState(true)
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [newFolderName, setNewFolderName] = useState("")
  const [creating, setCreating] = useState(false)

  const fetchFolders = async (parentId?: string | null) => {
    setLoading(true)
    try {
      const body: any = { action: "list_folders" }
      if (parentId) body.parent_id = parentId

      const res = await fetch(N8N_DRIVE_MANAGER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(120000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = await res.json()
      setFolders(data.folders || data.files || [])
    } catch (err) {
      toast.error("Gagal mengambil folder")
    }
    setLoading(false)
  }

  useEffect(() => {
    fetchFolders(ARKBOT_LIBRARY_ID)
  }, [])

  const handleCreateFolder = async () => {
    if (!newFolderName.trim()) return
    setCreating(true)
    try {
      const body: any = { action: "create_folder", name: newFolderName.trim() }
      if (ARKBOT_LIBRARY_ID) body.parent_id = ARKBOT_LIBRARY_ID

      const res = await fetch(N8N_DRIVE_MANAGER_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(120000),
      })
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      toast.success(`Folder "${newFolderName}" berhasil dibuat`)
      setNewFolderName("")
      setCreateDialogOpen(false)
      fetchFolders(ARKBOT_LIBRARY_ID)
    } catch (err) {
      toast.error("Gagal membuat folder")
    }
    setCreating(false)
  }

  const selectedName = value
    ? (() => {
        const found = folders.find(f => f.id === value)
        return found?.name || value
      })()
    : ARKBOT_LIBRARY_NAME

  return (
    <div className="space-y-2">
      <label className="text-xs font-medium text-white/50">Folder Tujuan</label>

      <div className="flex items-center gap-2">
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className={cn(
            "flex items-center gap-2 rounded-xl border px-3 py-2.5 text-sm transition-colors flex-1 text-left",
            dropdownOpen
              ? "border-white/20 bg-white/5 text-white"
              : "border-white/10 bg-white/[0.02] text-white/60 hover:bg-white/5"
          )}
        >
          <Folder className="h-4 w-4 shrink-0 text-amber-400/70" />
          <span className="flex-1 truncate">{selectedName}</span>
          <ChevronDown className={cn("h-4 w-4 shrink-0 transition-transform", dropdownOpen && "rotate-180")} />
        </button>

        <Button
          size="icon"
          variant="ghost"
          className="h-10 w-10 shrink-0 text-white/40 hover:text-orange-400 hover:bg-orange-400/10"
          onClick={() => setCreateDialogOpen(true)}
        >
          <FolderPlus className="h-4 w-4" />
        </Button>
      </div>

      {dropdownOpen && (
        <div className="rounded-xl border border-white/10 bg-[#1a1a1c] p-2 space-y-1 max-h-[250px] overflow-y-auto">
          <button
            onClick={() => { onChange(null); setDropdownOpen(false) }}
            className={cn(
              "flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm transition-colors text-left",
              !value
                ? "bg-orange-500/15 text-orange-400"
                : "text-white/60 hover:bg-white/5 hover:text-white/80"
            )}
          >
            <Folder className="h-4 w-4 shrink-0 text-amber-400/60" />
            <span>{ARKBOT_LIBRARY_NAME}</span>
            {!value && <span className="ml-auto text-[10px] text-orange-400">dipilih</span>}
          </button>

          {loading ? (
            <div className="flex items-center justify-center py-4">
              <Loader2 className="h-4 w-4 animate-spin text-white/40" />
            </div>
          ) : folders.length === 0 ? (
            <p className="text-xs text-white/30 text-center py-2">Tidak ada subfolder</p>
          ) : (
            folders.map((folder) => (
              <button
                key={folder.id}
                onClick={() => { onChange(folder.id); setDropdownOpen(false) }}
                className={cn(
                  "flex items-center gap-2 w-full rounded-lg px-3 py-2 text-sm transition-colors text-left",
                  value === folder.id
                    ? "bg-orange-500/15 text-orange-400"
                    : "text-white/60 hover:bg-white/5 hover:text-white/80"
                )}
              >
                <Folder className="h-4 w-4 shrink-0 text-amber-400/60" />
                <span className="truncate">{folder.name}</span>
                {value === folder.id && <span className="ml-auto text-[10px] text-orange-400">dipilih</span>}
              </button>
            ))
          )}

          <div className="flex justify-end pt-1 border-t border-white/5">
            <button
              onClick={() => fetchFolders(ARKBOT_LIBRARY_ID)}
              className="flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] text-white/30 hover:text-white/50 hover:bg-white/5"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </button>
          </div>
        </div>
      )}

      <AlertDialog open={createDialogOpen} onOpenChange={(open) => {
        if (!open) { setCreateDialogOpen(false); setNewFolderName("") }
      }}>
        <AlertDialogContent className="bg-[#1a1a1c] border-white/10">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-white">Buat Folder Baru</AlertDialogTitle>
            <AlertDialogDescription className="text-white/50">
              Folder akan dibuat di {selectedName}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <input
            type="text"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreateFolder()}
            placeholder="Nama folder..."
            autoFocus
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-orange-500/50"
          />
          <AlertDialogFooter>
            <AlertDialogCancel className="text-white/50">Batal</AlertDialogCancel>
            <Button
              onClick={handleCreateFolder}
              disabled={!newFolderName.trim() || creating}
              className="bg-orange-500 text-white hover:bg-orange-400"
            >
              {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <FolderPlus className="mr-2 h-4 w-4" />}
              Buat
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
