import { useEffect } from "react"
import { supabase } from "@/lib/supabase"
import { toast } from "sonner"
import { useNotifications } from "@/hooks/useNotifications"

interface WorkflowError {
  workflow_name: string
  message: string
  timestamp: string
}

export function useWorkflowErrors() {
  const { addNotification } = useNotifications()

  useEffect(() => {
    const channel = supabase
      .channel("workflow-errors")
      .on("broadcast", { event: "error" }, (payload) => {
        const data = payload.payload as WorkflowError
        toast.error(`Workflow Error: ${data.workflow_name}`, {
          description: data.message,
          duration: 8000,
        })
        addNotification(
          `Workflow Error: ${data.workflow_name}`,
          data.message
        )
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [addNotification])
}
