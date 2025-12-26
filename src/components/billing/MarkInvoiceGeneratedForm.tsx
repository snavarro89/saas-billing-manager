"use client"

import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { useRouter } from "next/navigation"
import type { Payment } from "@/types"
import { format } from "date-fns"

interface MarkInvoiceGeneratedFormProps {
  invoiceId: string
  customerInvoiceRequired: boolean
  availablePayments: Payment[]
  hasLinkedPayment?: boolean
}

export function MarkInvoiceGeneratedForm({ 
  invoiceId, 
  customerInvoiceRequired,
  availablePayments,
  hasLinkedPayment = false
}: MarkInvoiceGeneratedFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const [formData, setFormData] = useState({
    invoiceNumber: "",
    invoiceUrl: "",
    paymentId: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.invoiceNumber.trim()) {
      alert("Invoice number is required")
      return
    }

    // For non-invoice-required customers, payment selection is required only if:
    // - No payment is already linked to the invoice
    // - AND there are available payments to choose from
    if (!customerInvoiceRequired && !hasLinkedPayment && availablePayments.length > 0 && !formData.paymentId) {
      alert("Please select a payment to link to this invoice")
      return
    }

    setLoading(true)
    try {
      const res = await fetch(`/api/invoices/${invoiceId}/mark-generated`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoiceNumber: formData.invoiceNumber.trim(),
          invoiceUrl: formData.invoiceUrl.trim() || null,
          paymentId: formData.paymentId || null,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to mark invoice as generated")
      }

      router.refresh()
      setIsOpen(false)
      setFormData({ invoiceNumber: "", invoiceUrl: "", paymentId: "" })
    } catch (error: any) {
      alert(error.message || "Error marking invoice as generated")
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
      >
        Mark Generated
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50" onClick={() => setIsOpen(false)}>
      <div className="bg-white rounded-lg p-6 w-full max-w-md border-2 border-gray-300 shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold text-gray-900 mb-4">Mark Invoice as Generated</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Invoice Number <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={formData.invoiceNumber}
              onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
              placeholder="e.g., FAC-2024-001"
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
            />
            <p className="mt-1 text-xs text-gray-500">Alphanumeric invoice number from ERP/SAT</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Invoice URL (optional)
            </label>
            <input
              type="url"
              value={formData.invoiceUrl}
              onChange={(e) => setFormData({ ...formData, invoiceUrl: e.target.value })}
              placeholder="https://..."
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">URL/location of the generated invoice</p>
          </div>
          {!customerInvoiceRequired && !hasLinkedPayment && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Payment <span className="text-red-500">*</span>
              </label>
              {availablePayments.length > 0 ? (
                <>
                  <select
                    required
                    value={formData.paymentId}
                    onChange={(e) => setFormData({ ...formData, paymentId: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a payment</option>
                    {availablePayments.map((payment) => (
                      <option key={payment.id} value={payment.id}>
                        {payment.currency} {payment.amount.toFixed(2)} - {format(new Date(payment.paymentDate), "MMM d, yyyy")} ({payment.method})
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">Select which payment is tied to this invoice</p>
                </>
              ) : (
                <>
                  <div className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-500">
                    No unlinked payments available
                  </div>
                  <p className="mt-1 text-xs text-yellow-600">
                    All payments for this service period are already linked to invoices. You can still mark the invoice as generated.
                  </p>
                </>
              )}
            </div>
          )}
          {!customerInvoiceRequired && hasLinkedPayment && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
              <p className="text-sm text-blue-800">
                ✓ This invoice is already linked to a payment. Just enter the invoice number and URL to mark it as generated.
              </p>
            </div>
          )}
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setIsOpen(false)
                setFormData({ invoiceNumber: "", invoiceUrl: "", paymentId: "" })
              }}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Mark Generated"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

