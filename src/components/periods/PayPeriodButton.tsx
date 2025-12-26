"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/Button"
import { PaymentForm } from "@/components/payments/PaymentForm"
import type { ServicePeriod, Payment } from "@/types"

interface PayPeriodButtonProps {
  period: ServicePeriod
  customerId: string
  allPeriods: ServicePeriod[]
  payments?: Payment[]
}

export function PayPeriodButton({ period, customerId, allPeriods, payments = [] }: PayPeriodButtonProps) {
  const [showPaymentForm, setShowPaymentForm] = useState(false)

  // Check if this period has a payment
  const hasPayment = payments.some((payment) =>
    (payment as any).paymentPeriods?.some(
      (pp: any) => pp.servicePeriodId === period.id
    )
  )

  // Don't show button if period already has payment
  if (hasPayment) {
    return null
  }

  if (showPaymentForm) {
    // Map all periods with payment status
    const periodsWithStatus = allPeriods.map(p => {
      const periodHasPayment = payments.some((payment) =>
        (payment as any).paymentPeriods?.some(
          (pp: any) => pp.servicePeriodId === p.id
        )
      )
      return {
        id: p.id,
        startDate: p.startDate,
        endDate: p.endDate,
        subtotalAmount: p.subtotalAmount,
        currency: p.currency || "MXN",
        hasPayment: periodHasPayment,
      }
    })

    return (
      <PaymentForm
        customerId={customerId}
        servicePeriods={periodsWithStatus}
        initialPeriodId={period.id}
      />
    )
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={() => setShowPaymentForm(true)}
      className="text-green-600 hover:text-green-700 hover:border-green-700"
    >
      Pay
    </Button>
  )
}

