"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/Button"
import { useRouter } from "next/navigation"
import { addMonths } from "date-fns"
import { PlanSelector } from "@/components/plans/PlanSelector"
import { calculateEndDateFromFrequency } from "@/lib/period-utils"
import type { Plan, BillingCycle } from "@/types"

interface ServicePeriodFormProps {
  customerId: string
  defaultSubtotal?: number
  defaultCurrency?: string
}

export function ServicePeriodForm({ customerId, defaultSubtotal = 0, defaultCurrency = "MXN" }: ServicePeriodFormProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [plans, setPlans] = useState<Plan[]>([])
  const [selectedPlanId, setSelectedPlanId] = useState<string>("")
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null)
  const [selectedFrequency, setSelectedFrequency] = useState<BillingCycle | "">("")
  const [quantity, setQuantity] = useState<string>("1")
  const today = new Date().toISOString().split("T")[0]
  const defaultEndDate = addMonths(new Date(), 1).toISOString().split("T")[0]
  
  const [formData, setFormData] = useState({
    startDate: today,
    endDate: defaultEndDate,
    subtotalAmount: defaultSubtotal.toString(),
    currency: defaultCurrency,
    notes: "",
  })

  // Fetch plans when modal opens
  useEffect(() => {
    if (isOpen) {
      fetch("/api/plans?isActive=true")
        .then((res) => res.json())
        .then((data) => setPlans(data))
        .catch((err) => console.error("Error fetching plans:", err))
    }
  }, [isOpen])

  // Update selected plan when planId changes
  useEffect(() => {
    if (selectedPlanId) {
      const plan = plans.find((p) => p.id === selectedPlanId)
      setSelectedPlan(plan || null)
      // Reset frequency when plan changes
      setSelectedFrequency("")
      setFormData((prev) => ({ ...prev, subtotalAmount: "0" }))
    } else {
      setSelectedPlan(null)
    }
  }, [selectedPlanId, plans])

  // Calculate price when plan, frequency, or quantity changes
  useEffect(() => {
    if (selectedPlan && selectedFrequency) {
      const pricing = selectedPlan.pricing.find((p) => p.frequency === selectedFrequency)
      if (pricing) {
        let calculatedPrice = pricing.price
        if (selectedPlan.type === "PER_USER" && quantity) {
          calculatedPrice = pricing.price * parseFloat(quantity)
        }
        setFormData((prev) => ({
          ...prev,
          subtotalAmount: calculatedPrice.toFixed(2),
          currency: pricing.currency,
        }))
      }
    }
  }, [selectedPlan, selectedFrequency, quantity])

  // Calculate end date when start date or frequency changes
  useEffect(() => {
    if (formData.startDate && selectedFrequency) {
      const startDate = new Date(formData.startDate)
      const endDate = calculateEndDateFromFrequency(startDate, selectedFrequency as BillingCycle)
      setFormData((prev) => ({
        ...prev,
        endDate: endDate.toISOString().split("T")[0],
      }))
    }
  }, [formData.startDate, selectedFrequency])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (!selectedPlanId || !selectedFrequency) {
        alert("Please select a plan and frequency")
        return
      }

      if (selectedPlan?.type === "PER_USER" && (!quantity || parseFloat(quantity) <= 0)) {
        alert("Quantity must be greater than 0 for per-user plans")
        return
      }

      // Create plan snapshot
      const planSnapshot = selectedPlan ? {
        planId: selectedPlan.id,
        planCode: selectedPlan.code,
        planName: selectedPlan.name,
        type: selectedPlan.type,
        frequency: selectedFrequency,
        price: selectedPlan.pricing.find((p) => p.frequency === selectedFrequency)?.price || 0,
        currency: formData.currency,
        quantity: selectedPlan.type === "PER_USER" ? parseFloat(quantity) : null,
        usageLimits: selectedPlan.type === "USAGE_BASED" ? selectedPlan.usageLimits : [],
      } : null

      const res = await fetch("/api/periods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          startDate: formData.startDate,
          endDate: formData.endDate,
          subtotalAmount: parseFloat(formData.subtotalAmount),
          currency: formData.currency,
          notes: formData.notes,
          planId: selectedPlanId,
          planSnapshot,
          quantity: selectedPlan?.type === "PER_USER" ? parseFloat(quantity) : null,
          frequency: selectedFrequency,
        }),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to create service period")
      }

      router.refresh()
      setIsOpen(false)
      // Reset form
      setSelectedPlanId("")
      setSelectedPlan(null)
      setSelectedFrequency("")
      setQuantity("1")
      setFormData({
        startDate: today,
        endDate: defaultEndDate,
        subtotalAmount: defaultSubtotal.toString(),
        currency: defaultCurrency,
        notes: "",
      })
    } catch (error: any) {
      alert(error.message || "Error creating service period")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)}>Create Service Period</Button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setIsOpen(false)}>
      <div className="bg-white rounded-lg border-2 border-gray-300 p-6 max-w-md w-full max-h-[90vh] overflow-y-auto shadow-xl" onClick={(e) => e.stopPropagation()}>
        <h2 className="text-xl font-bold mb-4 text-gray-900">Create Service Period</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Plan <span className="text-red-500">*</span>
            </label>
            <PlanSelector
              value={selectedPlanId}
              onChange={setSelectedPlanId}
              required
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>

          {selectedPlan && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Frequency <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={selectedFrequency}
                onChange={(e) => setSelectedFrequency(e.target.value as BillingCycle)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="">Select frequency</option>
                {selectedPlan.pricing.map((p) => (
                  <option key={p.id} value={p.frequency}>
                    {p.frequency} - {p.currency} {p.price.toFixed(2)}
                  </option>
                ))}
              </select>
            </div>
          )}

          {selectedPlan?.type === "PER_USER" && selectedFrequency && (
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Quantity (Users) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                required
                min="0.01"
                step="0.01"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700">
              Start Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={formData.startDate}
              onChange={(e) =>
                setFormData({ ...formData, startDate: e.target.value })
              }
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-blue-500 focus:border-blue-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              End Date <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              required
              value={formData.endDate}
              onChange={(e) =>
                setFormData({ ...formData, endDate: e.target.value })
              }
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-blue-500 focus:border-blue-500"
            />
            {selectedFrequency && (
              <p className="mt-1 text-xs text-gray-500">
                Auto-calculated based on frequency
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Subtotal Amount <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              step="0.01"
              required
              readOnly
              value={formData.subtotalAmount}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-900"
            />
            {selectedPlan && selectedFrequency && (
              <p className="mt-1 text-xs text-gray-500">
                {selectedPlan.type === "PER_USER"
                  ? `Price: ${selectedPlan.pricing.find((p) => p.frequency === selectedFrequency)?.price.toFixed(2)} × ${quantity} = ${formData.subtotalAmount}`
                  : `Fixed price: ${formData.subtotalAmount}`}
              </p>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Currency
            </label>
            <input
              type="text"
              readOnly
              value={formData.currency}
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-100 text-gray-900"
            />
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
              {loading ? "Creating..." : "Create Period"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

