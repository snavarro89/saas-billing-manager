"use client"

import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { useRouter } from "next/navigation"
import type { Payment } from "@/types"

interface MarkInvoicePaidFormProps {
  invoiceId: string
  payments: Payment[]
}

export function MarkInvoicePaidForm({ invoiceId, payments }: MarkInvoicePaidFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [selectedPaymentId, setSelectedPaymentId] = useState<string>("")

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedPaymentId) {
      alert("Please select a payment")
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/mark-paid`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: selectedPaymentId,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to mark invoice as paid")
      }

      router.refresh()
      setIsOpen(false)
      setSelectedPaymentId("")
    } catch (error: any) {
      alert(error.message || "Error marking invoice as paid")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setIsOpen(true)}
        className="text-green-600 hover:text-green-700 hover:border-green-700"
      >
        Mark Paid
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setIsOpen(false)}>
      <div className="bg-white rounded-lg p-6 w-full max-w-md border-2 border-gray-300 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Mark Invoice as Paid</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Payment <span className="text-red-500">*</span>
            </label>
            <select
              required
              value={selectedPaymentId}
              onChange={(e) => setSelectedPaymentId(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Select a payment</option>
              {payments.map((payment) => (
                <option key={payment.id} value={payment.id}>
                  {payment.currency} {payment.amount.toFixed(2)} - {new Date(payment.paymentDate).toLocaleDateString()} ({payment.method})
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-gray-500">Select which payment paid this invoice</p>
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsOpen(false)
                setSelectedPaymentId("")
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading || !selectedPaymentId}>
              {loading ? "Saving..." : "Mark Paid"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

