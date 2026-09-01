import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom"
import { Toaster } from "sonner"
import { NotificationProvider } from "@/hooks/useNotifications"
import { ChatPage } from "@/pages/ChatPage"
import { LoginPage } from "@/pages/LoginPage"
import { AdminLayout } from "@/components/admin/AdminLayout"
import { DocumentsPage } from "@/pages/DocumentsPage"
import { AdminChatPage } from "@/pages/AdminChatPage"
import { UploadPage } from "@/pages/UploadPage"
import { AdminRegistrationsPage } from "@/pages/AdminRegistrationsPage"
import { ErrorBoundary } from "@/components/ErrorBoundary"

export default function App() {
  return (
    <ErrorBoundary>
      <NotificationProvider>
        <BrowserRouter>
          <Toaster theme="dark" position="bottom-right" />
          <Routes>
            <Route path="/" element={<ChatPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/admin" element={<AdminLayout />}>
              <Route index element={<Navigate to="/admin/documents" replace />} />
              <Route path="documents" element={<DocumentsPage />} />
              <Route path="chat" element={<AdminChatPage />} />
              <Route path="upload" element={<UploadPage />} />
              <Route path="registrations" element={<AdminRegistrationsPage />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </NotificationProvider>
    </ErrorBoundary>
  )
}
