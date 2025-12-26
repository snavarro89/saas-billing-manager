"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/Button"
import { useRouter } from "next/navigation"
import { format } from "date-fns"
import { calculateRenewalDates } from "@/lib/period-utils"
import type { BillingCycle } from "@/types"

interface RenewPeriodFormProps {
  periodId: string
  currentStartDate: Date
  currentEndDate: Date
  currentSubtotalAmount: number
  currentCurrency: string
  customerId: string
  billingCycle: BillingCycle
  onSuccess?: () => void
}

export function RenewPeriodForm({ 
  periodId, 
  currentStartDate,
  currentEndDate,
  currentSubtotalAmount,
  currentCurrency,
  customerId,
  billingCycle,
  onSuccess 
}: RenewPeriodFormProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  // Calculate suggested dates based on current period duration
  const { startDate: suggestedStartDate, endDate: suggestedEndDate } = 
    calculateRenewalDates(currentStartDate, currentEndDate)
  
  const [startDate, setStartDate] = useState(
    suggestedStartDate.toISOString().split("T")[0]
  )
  const [endDate, setEndDate] = useState(
    suggestedEndDate.toISOString().split("T")[0]
  )

  // Update dates when modal opens
  useEffect(() => {
    if (isOpen) {
      const { startDate: newStart, endDate: newEnd } = 
        calculateRenewalDates(currentStartDate, currentEndDate)
      setStartDate(newStart.toISOString().split("T")[0])
      setEndDate(newEnd.toISOString().split("T")[0])
    }
  }, [isOpen, currentStartDate, currentEndDate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Create a new service period instead of updating the existing one
      const res = await fetch("/api/periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          startDate: new Date(startDate).toISOString(),
          endDate: new Date(endDate).toISOString(),
          origin: "PAYMENT",
          subtotalAmount: currentSubtotalAmount,
          currency: currentCurrency,
          notes: `Renewed period - Previous period ended ${format(currentEndDate, "MMM d, yyyy")}`,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to renew period")
      }

      router.refresh()
      setIsOpen(false)
      onSuccess?.()
    } catch (error: any) {
      alert(error.message || "Error renewing period")
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
        Renew
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setIsOpen(false)}>
      <div className="bg-white rounded-lg border-2 border-gray-300 p-6 max-w-md w-full shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4 text-gray-900">Renew Service Period</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Current Period
            </label>
            <p className="text-gray-900 font-mono text-sm mt-1">
              {format(currentStartDate, "MMM d, yyyy")} - {format(currentEndDate, "MMM d, yyyy")}
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              New Start Date *
            </label>
            <input
              type="date"
              required
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Suggested: {format(suggestedStartDate, "MMM d, yyyy")} (starts when current period ends)
            </p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              New End Date *
            </label>
            <input
              type="date"
              required
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-blue-500 focus:border-blue-500"
            />
            <p className="text-xs text-gray-500 mt-1">
              Suggested: {format(suggestedEndDate, "MMM d, yyyy")} (same duration as current period)
            </p>
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
              {loading ? "Renewing..." : "Renew Period"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

