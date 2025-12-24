"use client"

import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { useRouter } from "next/navigation"

interface MarkInvoicedButtonProps {
  periodId: string
}

export function MarkInvoicedButton({ periodId }: MarkInvoicedButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const handleMarkInvoiced = async () => {
    if (!confirm("Mark this period as invoiced?")) {
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/periods/${periodId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ billingStatus: "INVOICED" }),
      })

      if (!res.ok) {
        throw new Error("Failed to update period")
      }

      router.refresh()
    } catch (error) {
      alert("Error updating period")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleMarkInvoiced}
      disabled={loading}
    >
      {loading ? "Updating..." : "Mark as Invoiced"}
    </Button>
  )
}

