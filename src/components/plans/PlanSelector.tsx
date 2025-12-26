"use client"

import { useState, useEffect } from "react"
import type { Plan } from "@/types"

interface PlanSelectorProps {
  value?: string
  onChange: (planId: string) => void
  required?: boolean
  className?: string
}

export function PlanSelector({ value, onChange, required, className }: PlanSelectorProps) {
  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchPlans() {
      try {
        const res = await fetch("/api/plans?isActive=true")
        if (res.ok) {
          const data = await res.json()
          setPlans(data)
        }
      } catch (error) {
        console.error("Error fetching plans:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchPlans()
  }, [])

  if (loading) {
    return (
      <select
        disabled
        className={className}
      >
        <option>Loading plans...</option>
      </select>
    )
  }

  return (
    <select
      value={value || ""}
      onChange={(e) => onChange(e.target.value)}
      required={required}
      className={className}
    >
      <option value="">Select a plan</option>
      {plans.map((plan) => (
        <option key={plan.id} value={plan.id}>
          {plan.name} ({plan.code}) - {plan.type === "PER_USER" ? "Per User" : "Usage Based"}
        </option>
      ))}
    </select>
  )
}

