"use client"

import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { useRouter } from "next/navigation"

interface MarkInvoicePaidButtonProps {
  invoiceId: string
}

export function MarkInvoicePaidButton({ invoiceId }: MarkInvoicePaidButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleMarkPaid = async () => {
    if (!confirm("Mark this invoice as paid?")) {
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/mark-paid`, {
        method: "PATCH",
      })

      if (!res.ok) {
        throw new Error("Failed to mark invoice as paid")
      }

      router.refresh()
    } catch (error) {
      alert("Error marking invoice as paid")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleMarkPaid}
      disabled={loading}
      className="text-green-600 hover:text-green-700 hover:border-green-700"
    >
      {loading ? "Updating..." : "Mark Paid"}
    </Button>
  )
}

