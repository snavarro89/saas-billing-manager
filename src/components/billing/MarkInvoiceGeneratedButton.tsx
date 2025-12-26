"use client"

import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { useRouter } from "next/navigation"

interface MarkInvoiceGeneratedButtonProps {
  invoiceId: string
}

export function MarkInvoiceGeneratedButton({ invoiceId }: MarkInvoiceGeneratedButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleMarkGenerated = async () => {
    if (!confirm("Mark this invoice as generated?")) {
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/mark-generated`, {
        method: "PATCH",
      })

      if (!res.ok) {
        throw new Error("Failed to mark invoice as generated")
      }

      router.refresh()
    } catch (error) {
      alert("Error marking invoice as generated")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleMarkGenerated}
      disabled={loading}
    >
      {loading ? "Updating..." : "Mark Generated"}
    </Button>
  )
}

