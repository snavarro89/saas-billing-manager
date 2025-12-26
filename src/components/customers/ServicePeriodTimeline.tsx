import { format } from "date-fns"
import { StatusBadge } from "@/components/status/StatusBadge"
import { RenewPeriodForm } from "@/components/periods/RenewPeriodForm"
import { DeletePeriodButton } from "@/components/periods/DeletePeriodButton"
import { PayPeriodButton } from "@/components/periods/PayPeriodButton"
import type { ServicePeriod, Payment, CommercialAgreement } from "@/types"

interface ServicePeriodTimelineProps {
  periods: ServicePeriod[]
  payments?: Payment[]
  activeAgreement?: CommercialAgreement | null
  customerId: string
  customerInvoiceRequired?: boolean
}

export function ServicePeriodTimeline({ 
  periods, 
  payments = [],
  activeAgreement,
  customerId,
  customerInvoiceRequired = false
}: ServicePeriodTimelineProps) {
  if (periods.length === 0) {
    return <p className="text-gray-500">No service periods</p>
  }

  return (
    <div className="space-y-4">
      {periods.map((period) => {
        // Find payments linked to this period
        const linkedPayments = payments.filter((payment) =>
          (payment as any).paymentPeriods?.some(
            (pp: any) => pp.servicePeriodId === period.id
          )
        )

        // Get invoice for this period
        const invoice = (period as any).invoice

        // Determine status warnings
        const hasPayment = linkedPayments.length > 0
        const hasInvoice = invoice !== null && invoice !== undefined
        const needsInvoice = !hasInvoice && hasPayment
        const needsPayment = hasInvoice && !hasPayment && customerInvoiceRequired

        return (
          <div
            key={period.id}
            className={`border-l-4 pl-4 py-2 ${
              hasPayment && hasInvoice
                ? "border-green-500 bg-green-50"
                : hasPayment || hasInvoice
                ? "border-yellow-500 bg-yellow-50"
                : "border-blue-500"
            }`}
          >
            <div className="flex justify-between items-start">
              <div className="flex-1">
                <p className="font-medium">
                  {format(new Date(period.startDate), "MMM d, yyyy")} -{" "}
                  {format(new Date(period.endDate), "MMM d, yyyy")}
                </p>
                <p className="text-sm text-gray-500">
                  {period.origin} • {period.currency || "MXN"}{" "}
                  {period.subtotalAmount.toFixed(2)}
                </p>
                
                {/* Invoice Status */}
                {hasInvoice && (
                  <div className="mt-2 text-sm">
                    <span className="font-medium text-blue-700">
                      📄 Invoice:
                    </span>
                    <span className="ml-2">
                      <StatusBadge status={invoice.status} />
                    </span>
                    {invoice.invoiceNumber && (
                      <span className="ml-2 text-gray-600">
                        (#{invoice.invoiceNumber})
                      </span>
                    )}
                  </div>
                )}

                {/* Payment Status */}
                {hasPayment && (
                  <div className="mt-2 text-sm">
                    <span className="font-medium text-green-700">
                      ✓ Payment linked:
                    </span>
                    {linkedPayments.map((payment) => (
                      <span
                        key={payment.id}
                        className="ml-2 text-green-600"
                      >
                        {payment.currency} {payment.amount.toFixed(2)} (
                        {format(new Date(payment.paymentDate), "MMM d, yyyy")})
                      </span>
                    ))}
                  </div>
                )}

                {/* Warnings */}
                {needsInvoice && (
                  <p className="mt-1 text-sm text-orange-600 font-medium">
                    ⚠ Payment received but invoice not created yet
                  </p>
                )}
                {needsPayment && (
                  <p className="mt-1 text-sm text-yellow-600 font-medium">
                    ⚠ Invoice generated but payment not received yet
                  </p>
                )}
                {!hasPayment && !hasInvoice && (
                  <p className="mt-1 text-sm text-gray-500">
                    No payment or invoice linked
                  </p>
                )}

                {period.notes && (
                  <p className="text-sm text-gray-600 mt-1">{period.notes}</p>
                )}
              </div>
              <div className="flex gap-2 ml-4 items-center flex-wrap">
                <StatusBadge status={period.status} />
                <StatusBadge status={period.billingStatus} />
                {!hasPayment && (
                  <PayPeriodButton
                    period={period}
                    customerId={customerId}
                    allPeriods={periods}
                    payments={payments}
                  />
                )}
                <RenewPeriodForm
                  periodId={period.id}
                  currentStartDate={new Date(period.startDate)}
                  currentEndDate={new Date(period.endDate)}
                  currentSubtotalAmount={period.subtotalAmount}
                  currentCurrency={period.currency || "MXN"}
                  customerId={customerId}
                  billingCycle={activeAgreement?.billingCycle || "MONTHLY"}
                />
                <DeletePeriodButton
                  periodId={period.id}
                  hasPayment={hasPayment}
                />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

