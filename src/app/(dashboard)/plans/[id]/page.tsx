"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import { UsageLimitsTable } from "@/components/plans/UsageLimitsTable"
import Link from "next/link"
import type { Plan, PlanPricing, PlanUsageLimit } from "@/types"

interface UsageLimit {
  id?: string
  concept: string
  limitValue: number | null
  unit: string | null
}

interface Pricing {
  id?: string
  frequency: string
  price: string
  currency: string
}

type PlanWithRelations = Plan & {
  pricing: PlanPricing[]
  usageLimits: PlanUsageLimit[]
}

export default function PlanDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  const [planId, setPlanId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [plan, setPlan] = useState<PlanWithRelations | null>(null)
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    description: "",
    type: "PER_USER" as "PER_USER" | "USAGE_BASED",
    isActive: true,
    conditions: "",
  })
  const [pricing, setPricing] = useState<Pricing[]>([])
  const [usageLimits, setUsageLimits] = useState<UsageLimit[]>([])

  useEffect(() => {
    let isMounted = true
    
    async function loadPlan() {
      const resolvedParams = await params
      if (!isMounted) return
      
      setPlanId(resolvedParams.id)
      
      try {
        const res = await fetch(`/api/plans/${resolvedParams.id}`)
        if (!res.ok) {
          throw new Error("Failed to load plan")
        }
        const data = await res.json()
        if (!isMounted) return
        
        setPlan(data)
        setFormData({
          code: data.code,
          name: data.name,
          description: data.description || "",
          type: data.type,
          isActive: data.isActive,
          conditions: data.conditions || "",
        })
        setPricing(
          data.pricing.map((p: PlanPricing) => ({
            id: p.id,
            frequency: p.frequency,
            price: p.price.toString(),
            currency: p.currency,
          }))
        )
        setUsageLimits(
          data.usageLimits.map((ul: PlanUsageLimit) => ({
            id: ul.id,
            concept: ul.concept,
            limitValue: ul.limitValue,
            unit: ul.unit,
          }))
        )
      } catch (error) {
        if (isMounted) {
          alert("Error loading plan")
        }
      } finally {
        if (isMounted) {
          setLoading(false)
        }
      }
    }
    loadPlan()
    
    return () => {
      isMounted = false
    }
  }, [params])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!planId) return

    setSaving(true)
    try {
      // Update plan basic info
      const res = await fetch(`/api/plans/${planId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to update plan")
      }

      // Update pricing (delete old, create new - simplified approach)
      // In a production app, you'd want to do smarter diffing
      const currentPricingIds = new Set(plan?.pricing.map((p: PlanPricing) => p.id) || [])
      const newPricingIds = new Set(pricing.filter(p => p.id).map(p => p.id))

      // Delete removed pricing
      for (const oldPricing of plan?.pricing || []) {
        if (!newPricingIds.has(oldPricing.id)) {
          await fetch(`/api/plans/${planId}/pricing/${oldPricing.id}`, {
            method: "DELETE",
          })
        }
      }

      // Create/update pricing
      for (const p of pricing) {
        if (p.id && currentPricingIds.has(p.id)) {
          // Update existing
          await fetch(`/api/plans/${planId}/pricing/${p.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              frequency: p.frequency,
              price: p.price,
              currency: p.currency,
            }),
          })
        } else if (!p.id) {
          // Create new
          await fetch(`/api/plans/${planId}/pricing`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              frequency: p.frequency,
              price: p.price,
              currency: p.currency,
            }),
          })
        }
      }

      // Similar for usage limits
      const currentLimitIds = new Set(plan?.usageLimits.map((ul: PlanUsageLimit) => ul.id) || [])
      const newLimitIds = new Set(usageLimits.filter(ul => ul.id).map(ul => ul.id))

      // Delete removed limits
      for (const oldLimit of plan?.usageLimits || []) {
        if (!newLimitIds.has(oldLimit.id)) {
          await fetch(`/api/plans/${planId}/usage-limits/${oldLimit.id}`, {
            method: "DELETE",
          })
        }
      }

      // Create/update limits
      for (const ul of usageLimits) {
        if (ul.id && currentLimitIds.has(ul.id)) {
          // Update existing
          await fetch(`/api/plans/${planId}/usage-limits/${ul.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              concept: ul.concept,
              limitValue: ul.limitValue,
              unit: ul.unit,
            }),
          })
        } else if (!ul.id) {
          // Create new
          await fetch(`/api/plans/${planId}/usage-limits`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              concept: ul.concept,
              limitValue: ul.limitValue,
              unit: ul.unit,
            }),
          })
        }
      }

      router.push("/plans")
      router.refresh()
    } catch (error: any) {
      alert(error.message || "Error updating plan")
    } finally {
      setSaving(false)
    }
  }

  const addPricing = () => {
    setPricing([...pricing, { frequency: "MONTHLY", price: "", currency: "MXN" }])
  }

  const removePricing = (index: number) => {
    if (pricing.length > 1) {
      setPricing(pricing.filter((_, i) => i !== index))
    } else {
      alert("Plan must have at least one pricing entry")
    }
  }

  const updatePricing = (index: number, field: keyof Pricing, value: string) => {
    const updated = [...pricing]
    updated[index] = { ...updated[index], [field]: value }
    setPricing(updated)
  }

  if (loading) {
    return <div className="p-6">Loading plan...</div>
  }

  if (!plan) {
    return <div className="p-6">Plan not found</div>
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Edit Plan</h1>
        <p className="mt-2 text-sm text-gray-600">
          {plan.name} ({plan.code})
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Plan Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">
                Code <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.code}
                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Type <span className="text-red-500">*</span>
              </label>
              <select
                required
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as "PER_USER" | "USAGE_BASED" })}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="PER_USER">Per User</option>
                <option value="USAGE_BASED">Usage Based</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                Conditions
              </label>
              <textarea
                value={formData.conditions}
                onChange={(e) => setFormData({ ...formData, conditions: e.target.value })}
                rows={3}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="isActive"
                checked={formData.isActive}
                onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="isActive" className="ml-2 block text-sm text-gray-700">
                Active
              </label>
            </div>
          </CardContent>
        </Card>

        {/* Pricing */}
        <Card className="mt-6">
          <CardHeader>
            <div className="flex justify-between items-center">
              <CardTitle>Pricing</CardTitle>
              <Button type="button" onClick={addPricing} size="sm">
                Add Pricing
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pricing.map((p, index) => (
                <div key={p.id || index} className="flex gap-4 items-end">
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Frequency
                    </label>
                    <select
                      required
                      value={p.frequency}
                      onChange={(e) => updatePricing(index, "frequency", e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="MONTHLY">Monthly</option>
                      <option value="QUARTERLY">Quarterly</option>
                      <option value="SEMI_ANNUAL">Semi-Annual</option>
                      <option value="CUSTOM">Custom</option>
                    </select>
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Price <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      value={p.price}
                      onChange={(e) => updatePricing(index, "price", e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="block text-sm font-medium text-gray-700">
                      Currency
                    </label>
                    <input
                      type="text"
                      value={p.currency}
                      onChange={(e) => updatePricing(index, "currency", e.target.value)}
                      className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                  {pricing.length > 1 && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => removePricing(index)}
                      className="text-red-600 hover:text-red-700"
                    >
                      Remove
                    </Button>
                  )}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Usage Limits (only for usage-based plans) */}
        {formData.type === "USAGE_BASED" && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Usage Limits</CardTitle>
            </CardHeader>
            <CardContent>
              <UsageLimitsTable limits={usageLimits} onChange={setUsageLimits} />
            </CardContent>
          </Card>
        )}

        <div className="mt-6 flex gap-4">
          <Button type="submit" disabled={saving}>
            {saving ? "Saving..." : "Save Changes"}
          </Button>
          <Link href="/plans">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  )
}

