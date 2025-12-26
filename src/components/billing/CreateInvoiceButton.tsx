"use client"

import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { useRouter } from "next/navigation"

interface CreateInvoiceButtonProps {
  servicePeriodId: string
}

export function CreateInvoiceButton({ servicePeriodId }: CreateInvoiceButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleCreateInvoice = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ servicePeriodId }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to create invoice")
      }

      router.refresh()
    } catch (error: any) {
      alert(error.message || "Error creating invoice")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCreateInvoice}
      disabled={loading}
    >
      {loading ? "Creating..." : "Create Invoice"}
    </Button>
  )
}

