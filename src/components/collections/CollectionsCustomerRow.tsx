"use client"

import { format } from "date-fns"
import { StatusBadge } from "@/components/status/StatusBadge"
import Link from "next/link"
import { PayPeriodButton } from "@/components/periods/PayPeriodButton"
import type { Customer, ServicePeriod, CommercialAgreement, Payment } from "@/types"

interface CollectionsCustomerRowProps {
  customer: Customer
  periods: ServicePeriod[]
  agreement: CommercialAgreement | null
  daysOverdue: number | null
  allCustomerPeriods: ServicePeriod[]
  payments: Payment[]
}

export function CollectionsCustomerRow({
  customer,
  periods,
  agreement,
  daysOverdue,
  allCustomerPeriods,
  payments,
}: CollectionsCustomerRowProps) {
  return (
    <div className="border border-gray-200 rounded-lg p-4 bg-white">
      <div className="flex justify-between items-start mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <Link
              href={`/customers/${customer.id}`}
              className="text-blue-600 hover:text-blue-800 font-semibold text-lg"
            >
              {customer.commercialName}
            </Link>
            <StatusBadge status={customer.operationalStatus || "ACTIVE"} />
          </div>
          {agreement && (
            <p className="text-sm text-gray-500 mt-1">
              Agreement: {agreement.currency} {agreement.subtotalAmount.toFixed(2)} • 
              Grace Period: {agreement.gracePeriodDays} days
            </p>
          )}
          {daysOverdue !== null && daysOverdue > 0 && (
            <p className="text-sm text-red-600 font-medium mt-1">
              {daysOverdue} day{daysOverdue !== 1 ? 's' : ''} overdue
            </p>
          )}
        </div>
      </div>

      <div className="mt-3 space-y-2">
        <p className="text-sm font-medium text-gray-700">
          Outstanding Service Periods ({periods.length}):
        </p>
        {periods.map((period) => {
          const periodStart = new Date(period.startDate)
          const periodEnd = new Date(period.endDate)
          
          return (
            <div
              key={period.id}
              className="flex items-center justify-between p-3 bg-gray-50 rounded border border-gray-200"
            >
              <div className="flex-1">
                <div className="flex items-center gap-3">
                  <span className="font-medium text-gray-900">
                    {format(periodStart, "MMM d, yyyy")} - {format(periodEnd, "MMM d, yyyy")}
                  </span>
                  <StatusBadge status={period.status} />
                  <StatusBadge status={period.billingStatus} />
                </div>
                <p className="text-sm text-gray-600 mt-1">
                  {period.currency || "MXN"} {period.subtotalAmount.toFixed(2)} • {period.origin}
                </p>
                {period.notes && (
                  <p className="text-xs text-gray-500 mt-1">{period.notes}</p>
                )}
              </div>
              <div className="ml-4">
                <PayPeriodButton
                  period={period}
                  customerId={customer.id}
                  allPeriods={allCustomerPeriods}
                  payments={payments}
                />
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

