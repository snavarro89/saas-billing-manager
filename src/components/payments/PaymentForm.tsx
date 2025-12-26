"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/Button"
import { useRouter } from "next/navigation"
import { format } from "date-fns"

interface PaymentFormProps {
  customerId: string
  servicePeriods?: Array<{
    id: string
    startDate: Date | string
    endDate: Date | string
    subtotalAmount: number
    currency: string
    hasPayment?: boolean
  }>
  initialPeriodId?: string // Pre-select a specific period
}

export function PaymentForm({ customerId, servicePeriods: initialPeriods, initialPeriodId }: PaymentFormProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Use provided periods or empty array
  const servicePeriods = initialPeriods || []
  
  // If initialPeriodId is provided, find that period and pre-select it
  const initialPeriod = initialPeriodId ? servicePeriods.find(p => p.id === initialPeriodId) : null
  
  const [formData, setFormData] = useState({
    paymentDate: new Date().toISOString().split("T")[0],
    amount: initialPeriod ? initialPeriod.subtotalAmount.toString() : "",
    currency: initialPeriod ? initialPeriod.currency : "MXN",
    method: "transfer",
    reference: "",
    screenshotUrl: "",
    notes: "",
    servicePeriodIds: initialPeriodId ? [initialPeriodId] : [] as string[],
  })
  
  // Auto-open modal if initialPeriodId is provided
  useEffect(() => {
    if (initialPeriodId && !isOpen) {
      setIsOpen(true)
    }
  }, [initialPeriodId])
  
  // Update form when initialPeriodId changes (e.g., when modal opens)
  useEffect(() => {
    if (initialPeriodId && isOpen) {
      const period = servicePeriods.find(p => p.id === initialPeriodId)
      if (period) {
        setFormData(prev => ({
          ...prev,
          amount: period.subtotalAmount.toString(),
          currency: period.currency,
          servicePeriodIds: [initialPeriodId],
          screenshotUrl: prev.screenshotUrl, // Keep existing screenshotUrl
        }))
      }
    }
  }, [initialPeriodId, isOpen, servicePeriods])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation: Must select at least one service period
    if (formData.servicePeriodIds.length === 0) {
      alert("Please select at least one service period to link this payment to.")
      return
    }

    // Validation: Amount cannot be 0
    const amountValue = parseFloat(formData.amount)
    if (!amountValue || amountValue <= 0) {
      alert("Amount must be greater than 0.")
      return
    }

    setLoading(true)

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          ...formData,
          amount: amountValue,
          servicePeriodIds: formData.servicePeriodIds,
        }),
      })

      if (!res.ok) {
        throw new Error("Failed to create payment")
      }

      router.refresh()
      setIsOpen(false)
      setFormData({
        paymentDate: new Date().toISOString().split("T")[0],
        amount: "",
        currency: "MXN",
        method: "transfer",
        reference: "",
        screenshotUrl: "",
        notes: "",
        servicePeriodIds: [],
      })
    } catch (error) {
      alert("Error creating payment")
    } finally {
      setLoading(false)
    }
  }

  const handleServicePeriodToggle = (periodId: string, isChecked: boolean) => {
    let newPeriodIds: string[]
    
    if (isChecked) {
      // Add to selected periods
      newPeriodIds = [...formData.servicePeriodIds, periodId]
    } else {
      // Remove from selected periods
      newPeriodIds = formData.servicePeriodIds.filter(id => id !== periodId)
    }
    
    // Calculate total amount from all selected periods
    const selectedPeriods = servicePeriods.filter(p => newPeriodIds.includes(p.id))
    const totalAmount = selectedPeriods.reduce((sum, period) => {
      // Only sum if currencies match, otherwise use the first period's currency
      return sum + period.subtotalAmount
    }, 0)
    
    // Get currency from first selected period (or keep current if none selected)
    const firstSelectedPeriod = selectedPeriods[0]
    
    setFormData({
      ...formData,
      servicePeriodIds: newPeriodIds,
      // Auto-set amount to sum of all selected periods' amounts
      amount: newPeriodIds.length > 0 ? totalAmount.toString() : "",
      // Auto-set currency to match the first selected period's currency
      currency: firstSelectedPeriod ? firstSelectedPeriod.currency : formData.currency,
    })
  }

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)}>Register Payment</Button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setIsOpen(false)}>
      <div className="bg-white rounded-lg border-2 border-gray-300 p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4 text-gray-900">Register Payment</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Payment Date
            </label>
            <input
              type="date"
              required
              value={formData.paymentDate}
              onChange={(e) =>
                setFormData({ ...formData, paymentDate: e.target.value })
              }
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Amount * <span className="text-red-500">(must be greater than 0)</span>
            </label>
            <input
              type="number"
              step="0.01"
              min="0.01"
              required
              value={formData.amount}
              onChange={(e) =>
                setFormData({ ...formData, amount: e.target.value })
              }
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Currency
            </label>
            <select
              value={formData.currency}
              onChange={(e) =>
                setFormData({ ...formData, currency: e.target.value })
              }
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="MXN">MXN</option>
              <option value="USD">USD</option>
              <option value="EUR">EUR</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Link to Service Period(s) * <span className="text-red-500">(required)</span>
            </label>
            <div className="mt-1 max-h-40 overflow-y-auto border border-gray-300 rounded-md p-2 bg-white">
              {servicePeriods.length === 0 ? (
                <p className="text-sm text-gray-500">No service periods available</p>
              ) : (
                servicePeriods.map((period) => {
                  const startDate = typeof period.startDate === 'string' 
                    ? new Date(period.startDate) 
                    : period.startDate
                  const endDate = typeof period.endDate === 'string' 
                    ? new Date(period.endDate) 
                    : period.endDate
                  
                  return (
                    <label
                      key={period.id}
                      className="flex items-center space-x-2 p-2 hover:bg-gray-50 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.servicePeriodIds.includes(period.id)}
                        onChange={(e) => handleServicePeriodToggle(period.id, e.target.checked)}
                        disabled={period.hasPayment}
                        className="rounded"
                      />
                      <div className="flex-1">
                        <div className="text-sm font-medium text-gray-900">
                          {format(startDate, "MMM d")} - {format(endDate, "MMM d, yyyy")}
                        </div>
                        <div className="text-xs text-gray-500">
                          {period.currency} {period.subtotalAmount.toFixed(2)}
                          {period.hasPayment && " (already has payment)"}
                        </div>
                      </div>
                    </label>
                  )
                })
              )}
            </div>
            <p className="mt-1 text-xs text-gray-500">
              You must select at least one service period to register the payment. Amount and currency will be auto-filled from the selected period.
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Method
            </label>
            <select
              required
              value={formData.method}
              onChange={(e) =>
                setFormData({ ...formData, method: e.target.value })
              }
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="transfer">Transfer</option>
              <option value="cash">Cash</option>
              <option value="check">Check</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Reference (optional)
            </label>
            <input
              type="text"
              value={formData.reference}
              onChange={(e) =>
                setFormData({ ...formData, reference: e.target.value })
              }
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Payment Screenshot URL (optional)
            </label>
            <input
              type="url"
              value={formData.screenshotUrl}
              onChange={(e) =>
                setFormData({ ...formData, screenshotUrl: e.target.value })
              }
              placeholder="https://..."
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              URL or location of the payment screenshot/receipt
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Notes (optional)
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) =>
                setFormData({ ...formData, notes: e.target.value })
              }
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-blue-500 focus:border-blue-500"
              rows={3}
            />
          </div>
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Processing..." : "Register Payment"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

