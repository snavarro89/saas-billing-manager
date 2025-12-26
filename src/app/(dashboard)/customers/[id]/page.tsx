import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import { StatusBadge } from "@/components/status/StatusBadge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { format } from "date-fns"
import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { PaymentForm } from "@/components/payments/PaymentForm"
import { ServicePeriodTimeline } from "@/components/customers/ServicePeriodTimeline"
import { ServicePeriodForm } from "@/components/periods/ServicePeriodForm"
import { CustomerEditForm } from "@/components/customers/CustomerEditForm"
import { calculateCustomerStatuses } from "@/lib/status-calculator"

async function getCustomer(id: string) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      agreements: {
        orderBy: { startDate: "desc" },
      },
      servicePeriods: {
        orderBy: { startDate: "desc" },
        include: {
          invoice: true,
        },
      },
      payments: {
        orderBy: { paymentDate: "desc" },
        include: {
          invoice: true,
          paymentPeriods: {
            include: {
              servicePeriod: {
                include: {
                  invoice: true,
                },
              },
            },
          },
        },
      },
    },
  })

  if (!customer) {
    return null
  }

  // Calculate statuses
  const today = new Date()
  const activePeriod = customer.servicePeriods.find(
    (p) => new Date(p.startDate) <= today && new Date(p.endDate) >= today && p.status === "ACTIVE"
  )

  return { customer, activePeriod }
}

export default async function CustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = await params
  const data = await getCustomer(resolvedParams.id)

  if (!data) {
    notFound()
  }

  const { customer, activePeriod } = data
  const activeAgreement = customer.agreements.find((a) => a.isActive)
  
  // Calculate current status
  const statuses = await calculateCustomerStatuses(customer.id)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Link href="/customers" className="text-blue-600 hover:text-blue-800 text-sm">
            ← Back to Customers
          </Link>
        </div>
        <div className="flex gap-2 items-center">
          <StatusBadge status={statuses.operationalStatus} />
          <StatusBadge status={customer.relationshipStatus || "ACTIVE"} />
        </div>
      </div>

      {/* Customer Information with Inline Edit */}
      <CustomerEditForm customer={customer} />

      {/* Agreement */}
      {activeAgreement && (
        <Card>
          <CardHeader>
            <CardTitle>Active Agreement</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Subtotal
                </label>
                <p className="text-gray-900 font-semibold">
                  {activeAgreement.currency} {activeAgreement.subtotalAmount.toFixed(2)}
                </p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Cycle</label>
                <p className="text-gray-900">{activeAgreement.billingCycle}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Renewal Day
                </label>
                <p className="text-gray-900">{activeAgreement.renewalDay}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">
                  Grace Period
                </label>
                <p className="text-gray-900">
                  {activeAgreement.gracePeriodDays} days
                </p>
              </div>
            </div>
            {activeAgreement.description && (
              <div className="mt-4">
                <label className="text-sm font-medium text-gray-500">
                  Description
                </label>
                <p className="text-gray-900">{activeAgreement.description}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Service Period Timeline */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle>Service Periods</CardTitle>
              <CardDescription>Manage service periods and link payments</CardDescription>
            </div>
            <ServicePeriodForm 
              customerId={customer.id}
              defaultSubtotal={activeAgreement?.subtotalAmount || 0}
              defaultCurrency={activeAgreement?.currency || "MXN"}
            />
          </div>
        </CardHeader>
        <CardContent>
              <ServicePeriodTimeline
                periods={customer.servicePeriods}
                payments={customer.payments}
                activeAgreement={activeAgreement}
                customerId={customer.id}
                customerInvoiceRequired={customer.invoiceRequired}
              />
        </CardContent>
      </Card>

      {/* Payment History */}
      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {customer.payments.length === 0 ? (
              <p className="text-gray-500">No payments recorded</p>
            ) : (
              customer.payments.map((payment) => (
                <div
                  key={payment.id}
                  className="border border-gray-200 rounded-lg p-4 bg-white"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {(payment as any).currency || "MXN"} {payment.amount.toFixed(2)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {format(new Date(payment.paymentDate), "MMM d, yyyy")} • {payment.method}
                      </p>
                      {payment.reference && (
                        <p className="text-sm text-gray-500">
                          Ref: {payment.reference}
                        </p>
                      )}
                      {(payment as any).screenshotUrl && (
                        <p className="text-sm text-blue-600 mt-1">
                          <a 
                            href={(payment as any).screenshotUrl} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            📷 View Screenshot
                          </a>
                        </p>
                      )}
                      {(payment as any).invoice && (
                        <div className="mt-2">
                          <p className="text-sm text-gray-600">
                            Invoice: <StatusBadge status={(payment as any).invoice.status} />
                            {(payment as any).invoice.invoiceNumber && (
                              <span className="ml-2 text-gray-500">
                                (#{(payment as any).invoice.invoiceNumber})
                              </span>
                            )}
                          </p>
                        </div>
                      )}
                      {!((payment as any).invoice) && (payment as any).paymentPeriods?.length > 0 && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-500">
                            {(() => {
                              const periods = (payment as any).paymentPeriods.map((pp: any) => pp.servicePeriod)
                              const hasInvoice = periods.some((p: any) => p.invoice)
                              if (hasInvoice) {
                                return "Invoice exists for linked period"
                              }
                              return "No invoice linked"
                            })()}
                          </p>
                        </div>
                      )}
                    </div>
                    <StatusBadge status={payment.status} />
                  </div>
                  {payment.notes && (
                    <p className="text-sm text-gray-600 mt-2">{payment.notes}</p>
                  )}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <PaymentForm 
              customerId={customer.id}
              servicePeriods={customer.servicePeriods.map(p => {
                const hasPayment = customer.payments.some(payment =>
                  payment.paymentPeriods?.some((pp: any) => pp.servicePeriodId === p.id)
                )
                return {
                  id: p.id,
                  startDate: p.startDate,
                  endDate: p.endDate,
                  subtotalAmount: p.subtotalAmount,
                  currency: p.currency,
                  hasPayment,
                }
              })}
            />
            <Button variant="outline">Suspend Customer</Button>
            <Button variant="outline">Mark as Lost</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

