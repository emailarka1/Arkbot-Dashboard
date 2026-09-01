export const N8N_DRIVE_MANAGER_URL =
  "https://arkbot-n8n.6jkqbm.easypanel.host/webhook/drive-manager"

export interface DriveCloudFile {
  id: string
  name: string
  mimeType: string
  size: string
  modifiedTime: string
  kind?: string
  parents?: string[]
}

export interface DriveFolder {
  id: string
  name: string
  parents: string[]
}
