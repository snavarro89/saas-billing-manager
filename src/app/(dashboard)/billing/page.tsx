import { prisma } from "@/lib/db"
import { StatusBadge } from "@/components/status/StatusBadge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { format } from "date-fns"
import Link from "next/link"
import { MarkInvoiceGeneratedForm } from "@/components/billing/MarkInvoiceGeneratedForm"
import { MarkInvoicePaidForm } from "@/components/billing/MarkInvoicePaidForm"
import { CreateInvoiceButton } from "@/components/billing/CreateInvoiceButton"

async function getPendingBillingItems() {
  // Get invoices that are PENDING (need to be generated)
  const pendingInvoices = await prisma.invoice.findMany({
    where: {
      status: "PENDING",
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
      servicePeriod: {
        include: {
          paymentPeriods: {
            include: {
              payment: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  })

  // Get service periods that have payments but no invoices (for non-invoice-required customers)
  const periodsWithPayments = await prisma.servicePeriod.findMany({
    where: {
      invoice: null, // No invoice exists
      paymentPeriods: {
        some: {}, // Has at least one payment
      },
      customer: {
        invoiceRequired: false, // Only for non-invoice-required customers
      },
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
      paymentPeriods: {
        include: {
          payment: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  })

  // Format invoices
  const formattedInvoices = await Promise.all(pendingInvoices.map(async (invoice) => {
    const agreement = invoice.customer.agreements[0]
    const hasPayment = invoice.servicePeriod.paymentPeriods.length > 0
    
    // Get available payments for non-invoice-required customers
    // These are payments linked to the service period that don't have an invoice linked yet
    let availablePayments: any[] = []
    let hasLinkedPayment = false
    
    if (!invoice.customer.invoiceRequired) {
      // Check if any payment is already linked to this invoice
      const linkedPayment = await prisma.payment.findFirst({
        where: {
          invoiceId: invoice.id,
        },
      })
      
      hasLinkedPayment = !!linkedPayment
      
      // Only get available payments if no payment is linked yet
      if (!hasLinkedPayment) {
        // Get payments linked to this service period via PaymentPeriod
        const paymentPeriods = await prisma.paymentPeriod.findMany({
          where: {
            servicePeriodId: invoice.servicePeriodId,
          },
          include: {
            payment: true,
          },
        })
        
        // Filter to only payments that don't have an invoice linked
        availablePayments = paymentPeriods
          .map(pp => pp.payment)
          .filter(payment => !payment.invoiceId)
          .sort((a, b) => new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime())
      }
    }
    
    return {
      type: "invoice" as const,
      id: invoice.id,
      customer: invoice.customer,
      servicePeriod: invoice.servicePeriod,
      agreement,
      subtotalAmount: invoice.subtotalAmount,
      taxAmount: invoice.taxAmount,
      totalAmount: invoice.totalAmount,
      currency: invoice.currency,
      status: invoice.status,
      hasPayment,
      invoiceRequired: invoice.customer.invoiceRequired,
      availablePayments,
      hasLinkedPayment,
    }
  }))

  // Format periods needing invoices
  const formattedPeriods = periodsWithPayments.map((period) => {
    const agreement = period.customer.agreements[0]
    const taxRate = 0.16
    const taxAmount = period.subtotalAmount * taxRate
    const totalAmount = period.subtotalAmount + taxAmount

    return {
      type: "period" as const,
      id: period.id,
      customer: period.customer,
      servicePeriod: period,
      agreement,
      subtotalAmount: period.subtotalAmount,
      taxAmount,
      totalAmount,
      currency: period.currency || "MXN",
      paymentCount: period.paymentPeriods.length,
      invoiceRequired: period.customer.invoiceRequired,
    }
  })

  return [...formattedInvoices, ...formattedPeriods]
}

async function getGeneratedInvoices() {
  // Get all GENERATED invoices
  const allGeneratedInvoices = await prisma.invoice.findMany({
    where: {
      status: "GENERATED",
    },
    include: {
      customer: {
        include: {
          agreements: {
            where: { isActive: true },
            take: 1,
          },
          payments: {
            where: {
              invoiceId: null, // Payments not yet linked to an invoice
            },
            orderBy: { paymentDate: "desc" },
          },
        },
      },
      servicePeriod: {
        include: {
          paymentPeriods: {
            include: {
              payment: true,
            },
          },
        },
      },
    },
    orderBy: { generatedDate: "asc" },
  })

  // Get all invoice IDs that have payments linked to them
  const invoicesWithPayments = await prisma.payment.findMany({
    where: {
      invoiceId: { not: null },
    },
    select: {
      invoiceId: true,
    },
  })

  const paidInvoiceIds = new Set(
    invoicesWithPayments
      .map(p => p.invoiceId)
      .filter((id): id is string => id !== null)
  )

  // Filter out invoices that already have a payment linked
  const invoicesNeedingPayment = allGeneratedInvoices
    .filter(invoice => !paidInvoiceIds.has(invoice.id))
    .map((invoice) => {
      const agreement = invoice.customer.agreements[0]
      const hasPayment = invoice.servicePeriod.paymentPeriods.length > 0
      return {
        ...invoice,
        agreement,
        hasPayment,
        availablePayments: invoice.customer.payments,
      }
    })

  return invoicesNeedingPayment
}

export default async function BillingPage() {
  const pendingItems = await getPendingBillingItems()
  const generatedInvoices = await getGeneratedInvoices()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Informative Billing</h1>
        <p className="mt-2 text-sm text-gray-600">
          Invoices pending generation or payment. This system does not generate invoices.
        </p>
      </div>

      {/* Pending to Generate */}
      <Card>
        <CardHeader>
          <CardTitle>Pending to Generate</CardTitle>
          <p className="text-sm text-gray-500 mt-1">
            Service periods that need invoices to be created
          </p>
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
                    Tax
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Total
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingItems.length === 0 ? (
                  <tr>
                    <td
                      colSpan={10}
                      className="px-6 py-4 text-center text-gray-500"
                    >
                      No items pending invoice generation
                    </td>
                  </tr>
                ) : (
                  pendingItems.map((item) => (
                    <tr key={`${item.type}-${item.id}`} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/customers/${item.customer.id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {item.customer.commercialName}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                        {item.customer.legalName || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                        {item.customer.rfc || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {item.customer.fiscalRegime || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(item.servicePeriod.startDate), "MMM d")} -{" "}
                        {format(new Date(item.servicePeriod.endDate), "MMM d, yyyy")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.currency} {item.subtotalAmount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {item.currency} {item.taxAmount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {item.currency} {item.totalAmount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.type === "invoice" ? (
                          <StatusBadge status={item.status} />
                        ) : (
                          <span className="text-sm text-green-600 font-medium">
                            ✓ Paid ({item.paymentCount} payment{item.paymentCount !== 1 ? 's' : ''})
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {item.type === "invoice" ? (
                          <MarkInvoiceGeneratedForm 
                            invoiceId={item.id} 
                            customerInvoiceRequired={item.invoiceRequired}
                            availablePayments={item.availablePayments || []}
                            hasLinkedPayment={item.hasLinkedPayment || false}
                          />
                        ) : (
                          <CreateInvoiceButton servicePeriodId={item.id} />
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Generated Invoices (Need Payment) */}
      {generatedInvoices.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Generated Invoices (Need Payment)</CardTitle>
            <p className="text-sm text-gray-500 mt-1">
              Invoices that have been generated but are missing payment
            </p>
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
                      Invoice Number
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Period
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {generatedInvoices.map((invoice) => (
                    <tr key={invoice.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/customers/${invoice.customer.id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {invoice.customer.commercialName}
                        </Link>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                        {invoice.invoiceNumber || "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {format(new Date(invoice.servicePeriod.startDate), "MMM d")} -{" "}
                        {format(new Date(invoice.servicePeriod.endDate), "MMM d, yyyy")}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                        {invoice.currency} {invoice.totalAmount.toFixed(2)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={invoice.status} />
                        {!invoice.hasPayment && (
                          <span className="ml-2 text-xs text-yellow-600">⚠ No payment</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {invoice.availablePayments.length > 0 ? (
                          <MarkInvoicePaidForm invoiceId={invoice.id} payments={invoice.availablePayments} />
                        ) : (
                          <span className="text-sm text-gray-500">No payments available</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
