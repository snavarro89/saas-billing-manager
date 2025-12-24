import { prisma } from "@/lib/db"
import { notFound } from "next/navigation"
import { StatusBadge } from "@/components/status/StatusBadge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import { format } from "date-fns"
import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { PaymentForm } from "@/components/payments/PaymentForm"
import { ServicePeriodTimeline } from "@/components/customers/ServicePeriodTimeline"

async function getCustomer(id: string) {
  const customer = await prisma.customer.findUnique({
    where: { id },
    include: {
      agreements: {
        orderBy: { startDate: "desc" },
      },
      servicePeriods: {
        orderBy: { startDate: "desc" },
      },
      payments: {
        orderBy: { paymentDate: "desc" },
        include: {
          paymentPeriods: {
            include: {
              servicePeriod: true,
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
    (p) => p.startDate <= today && p.endDate >= today && p.status === "ACTIVE"
  )

  return { customer, activePeriod }
}

export default async function CustomerDetailPage({
  params,
}: {
  params: { id: string }
}) {
  const data = await getCustomer(params.id)

  if (!data) {
    notFound()
  }

  const { customer, activePeriod } = data
  const activeAgreement = customer.agreements.find((a) => a.isActive)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <Link href="/customers" className="text-blue-600 hover:text-blue-800 text-sm">
            ← Back to Customers
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mt-2">
            {customer.commercialName}
          </h1>
          {customer.alias && (
            <p className="text-gray-600 mt-1">Alias: {customer.alias}</p>
          )}
        </div>
        <div className="flex gap-2">
          <StatusBadge status={customer.operationalStatus || "ACTIVE"} />
          <StatusBadge status={customer.relationshipStatus || "ACTIVE"} />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Commercial Info */}
        <Card>
          <CardHeader>
            <CardTitle>Commercial Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">
                Admin Contact
              </label>
              <p className="text-gray-900">{customer.adminContact || "—"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">
                Billing Contact
              </label>
              <p className="text-gray-900">{customer.billingContact || "—"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">Notes</label>
              <p className="text-gray-900 whitespace-pre-wrap">
                {customer.notes || "—"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Fiscal Info */}
        <Card>
          <CardHeader>
            <CardTitle>Fiscal Information</CardTitle>
            <CardDescription>For invoice preparation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-500">
                Legal Name
              </label>
              <p className="text-gray-900 font-mono text-sm">
                {customer.legalName || "—"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">RFC</label>
              <p className="text-gray-900 font-mono text-sm">
                {customer.rfc || "—"}
              </p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">
                Fiscal Regime
              </label>
              <p className="text-gray-900">{customer.fiscalRegime || "—"}</p>
            </div>
            <div>
              <label className="text-sm font-medium text-gray-500">
                Billing Email
              </label>
              <p className="text-gray-900">{customer.billingEmail || "—"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

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
          <CardTitle>Service Periods</CardTitle>
        </CardHeader>
        <CardContent>
          <ServicePeriodTimeline periods={customer.servicePeriods} />
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
                  className="border border-gray-200 rounded-lg p-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-semibold">
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
            <PaymentForm customerId={customer.id} />
            <Button variant="outline">Extend Service Period</Button>
            <Button variant="outline">Suspend Customer</Button>
            <Button variant="outline">Mark as Lost</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

