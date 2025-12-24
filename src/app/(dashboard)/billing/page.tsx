import { prisma } from "@/lib/db"
import { StatusBadge } from "@/components/status/StatusBadge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { format } from "date-fns"
import Link from "next/link"
import { Button } from "@/components/ui/Button"
import { MarkInvoicedButton } from "@/components/billing/MarkInvoicedButton"

async function getPendingInvoices() {
  const periods = await prisma.servicePeriod.findMany({
    where: {
      billingStatus: "PENDING",
      status: { in: ["ACTIVE", "EXPIRING", "EXPIRED"] },
    },
    include: {
      customer: {
        include: {
          agreements: {
            where: { isActive: true },
            take: 1,
          },
        },
      },
    },
    orderBy: { suggestedInvoiceDate: "asc" },
  })

  return periods.map((period) => {
    const agreement = period.customer.agreements[0]
    const taxRate = 0.16 // 16% IVA - this should come from agreement or be configurable
    const tax = period.subtotalAmount * taxRate
    const total = period.subtotalAmount + tax

    return {
      ...period,
      tax,
      total,
      agreement,
    }
  })
}

export default async function BillingPage() {
  const pendingInvoices = await getPendingInvoices()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Informative Billing</h1>
        <p className="mt-2 text-sm text-gray-600">
          Service periods pending invoice generation. This system does not generate invoices.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Pending to Invoice</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Commercial Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Legal Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    RFC
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Fiscal Regime
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Period
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Subtotal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Tax (16%)
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Action
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingInvoices.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-6 py-4 text-center text-gray-500"
                    >
                      No pending invoices
                    </td>
                  </tr>
                ) : (
                  pendingInvoices.map((period) => (
                    <tr key={period.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/customers/${period.customer.id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {period.customer.commercialName}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                        {period.customer.legalName || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                        {period.customer.rfc || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {period.customer.fiscalRegime || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(period.startDate), "MMM d")} -{" "}
                        {format(new Date(period.endDate), "MMM d, yyyy")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {period.agreement?.currency || "MXN"}{" "}
                        {period.subtotalAmount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {period.agreement?.currency || "MXN"}{" "}
                        {period.tax.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {period.agreement?.currency || "MXN"}{" "}
                        {period.total.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={period.billingStatus} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <MarkInvoicedButton periodId={period.id} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

