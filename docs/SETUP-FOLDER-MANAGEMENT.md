# Setup Folder Management - Panduan Lengkap

## Overview

Dashboard sudah support folder management. Yang perlu dilakukan:
1. Update n8n workflow `/drive-manager` — tambah action `list_folders` dan `create_folder`
2. Update n8n workflow `/web-upload` — support `folder_id`
3. Tambah `Respond to Webhook` di akhir workflow

---

## Workflow 1: Update `/drive-manager`

### Step 1: Buka Workflow
Buka workflow **Google Drive Manager** di n8n.

### Step 2: Update Switch Node
Klik node **Switch** → tambah 2 rules baru:

**Rule 3 — list_folders:**
- Value 1: `{{ $json.action }}`
- Operation: `equals`
- Value 2: `list_folders`

**Rule 4 — create_folder:**
- Value 1: `{{ $json.action }}`
- Operation: `equals`
- Value 2: `create_folder`

### Step 3: Tambah Node untuk `list_folders`

1. Klik **+** setelah Switch output ke-3 (list_folders)
2. Tambah **HTTP Request** node:
   - Name: `List Folders`
   - Method: `GET`
   - URL:
     ```
     https://www.googleapis.com/drive/v3/files?q=mimeType%3D'application%2Fvnd.google-apps.folder'%20and%20'{{ $('Webhook').item.json.parent_id || 'root' }}'%20in%20parents&fields=files(id,name,parents)&pageSize=100
     ```
   - Authentication: `OAuth2` (Google credential yang sama)

3. Setelah HTTP Request, tambah **Code** node:
   - Name: `Format Folders Response`
   - Code:
     ```javascript
     const files = $input.first().json.files || [];
     const folders = files.map(f => ({
       id: f.id,
       name: f.name,
       parents: f.parents || []
     }));
     return [{ json: { folders } }];
     ```

### Step 4: Tambah Node untuk `create_folder`

1. Klik **+** setelah Switch output ke-4 (create_folder)
2. Tambah **HTTP Request** node:
   - Name: `Create Folder`
   - Method: `POST`
   - URL: `https://www.googleapis.com/drive/v3/files`
   - Authentication: `OAuth2`
   - Body Type: `JSON`
   - Body:
     ```json
     {
       "name": "{{ $('Webhook').item.json.name }}",
       "mimeType": "application/vnd.google-apps.folder",
       "parents": ["{{ $('Webhook').item.json.parent_id || 'root' }}"]
     }
     ```

3. Setelah HTTP Request, tambah **Code** node:
   - Name: `Format Created Response`
   - Code:
     ```javascript
     const data = $input.first().json;
     return [{ json: {
       id: data.id,
       name: data.name,
       parents: data.parents || []
     } }];
     ```

### Step 5: Tambah Respond to Webhook

1. Tambah **Respond to Webhook** node di **PALING AKHIR** workflow
2. Connect semua output (list, delete, list_folders, create_folder) ke Respond to Webhook
3. Settings:
   - Respond With: `JSON`
   - Response Body: `{{ JSON.stringify($json) }}`

### Step 6: Update List Files Existing

Di node **Google Drive - List** yang sudah ada, tambahkan field `kind` dan `parents`:
- Kalau pakai Google Drive node: pastikan `kind` di-return
- Kalau pakai HTTP Request: tambah `kind` dan `parents` di `fields` parameter

### Step 7: Save & Activate

---

## Workflow 2: Update `/web-upload`

### Step 1: Buka Workflow
Buka workflow **Upload** di n8n.

### Step 2: Update Upload Node

Di node yang upload file ke Google Drive:

**Kalau pakai Google Drive node:**
- Cari field untuk parent folder
- Set value: `{{ $('Webhook').item.json.folder_id || 'root' }}`

**Kalau pakai HTTP Request:**
- Pastikan body include parents:
  ```json
  {
    "name": "{{ $json.file_name }}",
    "parents": ["{{ $('Webhook').item.json.folder_id || 'root' }}"]
  }
  ```

### Step 3: Save & Activate

---

## Credential Check

Pastikan Google OAuth2 credential punya scope:
- `https://www.googleapis.com/auth/drive`

Kalau belum, update di Google Cloud Console.

---

## Test Checklist

- [ ] POST `/drive-folder-manager` dengan `{ "action": "list_folders" }` → return folders
- [ ] POST `/drive-folder-manager` dengan `{ "action": "create_folder", "name": "Test Folder" }` → buat folder baru
- [ ] Upload file dengan `folder_id` → file masuk ke folder yang benar
- [ ] Dashboard Drive tab tampilkan folder dengan breadcrumb
- [ ] Dashboard Upload page tampilkan folder selector

---

## Troubleshooting

### Error "Invalid JSON"
- Pastikan Response Body pakai format JSON yang benar: `{ "key": "value" }`
- Bukan `key: value`

### Error "Credential not found"
- Cek ID credential di node HTTP Request
- Buka n8n → Settings → Credentials → cari Google OAuth2

### Folder tidak muncul di dashboard
- Cek response `list_folders` return format `{ folders: [...] }`
- Cek browser console untuk error

### Upload ke folder gagal
- Cek node upload sudah terima `folder_id`
- Cek `parents` field di body upload
