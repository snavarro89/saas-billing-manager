"use client"

import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { useRouter } from "next/navigation"

interface DeletePeriodButtonProps {
  periodId: string
  hasPayment: boolean
  onSuccess?: () => void
}

export function DeletePeriodButton({ 
  periodId, 
  hasPayment,
  onSuccess 
}: DeletePeriodButtonProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  // Don't show delete button if there's a payment linked
  if (hasPayment) {
    return null
  }

  const handleDelete = async () => {
    setLoading(true)

    try {
      const res = await fetch(`/api/periods/${periodId}`, {
        method: "DELETE",
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to delete period")
      }

      router.refresh()
      setShowConfirm(false)
      onSuccess?.()
    } catch (error: any) {
      alert(error.message || "Error deleting period")
    } finally {
      setLoading(false)
    }
  }

  if (!showConfirm) {
    return (
      <Button 
        variant="outline" 
        size="sm"
        onClick={() => setShowConfirm(true)}
        className="text-red-600 hover:text-red-700 hover:border-red-700"
      >
        Delete
      </Button>
    )
  }

  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={() => setShowConfirm(false)}
        disabled={loading}
      >
        Cancel
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={handleDelete}
        disabled={loading}
        className="bg-red-600 text-white hover:bg-red-700 border-red-600"
      >
        {loading ? "Deleting..." : "Confirm Delete"}
      </Button>
    </div>
  )
}

