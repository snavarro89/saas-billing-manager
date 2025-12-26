import { prisma } from "@/lib/db"
import { StatusBadge } from "@/components/status/StatusBadge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { format, addDays, differenceInDays } from "date-fns"
import Link from "next/link"
import { CollectionsCustomerRow } from "@/components/collections/CollectionsCustomerRow"

async function getCollectionsData() {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // Get all service periods that don't have payments linked
  // For invoice-required customers, also check that invoice is GENERATED
  const unpaidPeriods = await prisma.servicePeriod.findMany({
    where: {
      paymentPeriods: {
        none: {}
      }
    },
    include: {
      invoice: true,
      customer: {
        include: {
          agreements: {
            where: { isActive: true },
            take: 1,
          },
          servicePeriods: {
            include: {
              paymentPeriods: {
                include: {
                  payment: true,
                },
              },
              invoice: true,
            },
          },
          payments: {
            include: {
              paymentPeriods: true,
            },
          },
        },
      },
    },
    orderBy: {
      endDate: 'asc'
    }
  })

  // Filter periods based on invoice requirements
  const filteredPeriods = unpaidPeriods.filter(period => {
    // If customer requires invoice first
    if (period.customer.invoiceRequired) {
      // Only show if invoice exists and is GENERATED
      return period.invoice !== null && period.invoice.status === "GENERATED"
    }
    // If customer doesn't require invoice first, show all unpaid periods
    return true
  })

  // Group periods by customer
  const customerPeriodsMap = new Map<string, typeof filteredPeriods>()
  filteredPeriods.forEach(period => {
    const customerId = period.customerId
    if (!customerPeriodsMap.has(customerId)) {
      customerPeriodsMap.set(customerId, [])
    }
    customerPeriodsMap.get(customerId)!.push(period)
  })

  // Get unique customers with their unpaid periods
  const customersWithUnpaidPeriods = Array.from(customerPeriodsMap.entries()).map(([customerId, periods]) => {
    const customer = periods[0].customer
    const agreement = customer.agreements[0] || null
    
    // Calculate days overdue for the oldest unpaid period
    const oldestPeriod = periods.sort((a, b) => 
      new Date(a.endDate).getTime() - new Date(b.endDate).getTime()
    )[0]
    
    const periodEndDate = new Date(oldestPeriod.endDate)
    periodEndDate.setHours(23, 59, 59, 999)
    const daysOverdue = periodEndDate < today 
      ? differenceInDays(today, periodEndDate)
      : null

    // Determine if in grace period
    let inGracePeriod = false
    if (agreement && daysOverdue !== null && daysOverdue > 0) {
      inGracePeriod = daysOverdue <= (agreement.gracePeriodDays || 0)
    }

    return {
      customer,
      periods,
      agreement,
      daysOverdue,
      inGracePeriod,
      oldestPeriodEndDate: oldestPeriod.endDate,
    }
  })

  // Categorize customers
  const overdueCustomers: typeof customersWithUnpaidPeriods = []
  const gracePeriodCustomers: typeof customersWithUnpaidPeriods = []
  const suspendedCustomers: typeof customersWithUnpaidPeriods = []

  customersWithUnpaidPeriods.forEach(customerData => {
    const { customer, daysOverdue, inGracePeriod } = customerData

    // Suspended customers go to suspended section
    if (customer.operationalStatus === 'SUSPENDED') {
      suspendedCustomers.push(customerData)
    }
    // Customers in grace period (overdue but within grace period)
    else if (inGracePeriod && daysOverdue !== null && daysOverdue > 0) {
      gracePeriodCustomers.push(customerData)
    }
    // Overdue customers (past grace period or no grace period)
    else if (daysOverdue !== null && daysOverdue > 0) {
      overdueCustomers.push(customerData)
    }
    // Customers with pending payments but not yet overdue
    else {
      gracePeriodCustomers.push(customerData)
    }
  })

  // Sort each category
  overdueCustomers.sort((a, b) => (b.daysOverdue || 0) - (a.daysOverdue || 0))
  gracePeriodCustomers.sort((a, b) => {
    const aDays = a.daysOverdue || 0
    const bDays = b.daysOverdue || 0
    if (aDays !== bDays) return bDays - aDays
    return new Date(a.oldestPeriodEndDate).getTime() - new Date(b.oldestPeriodEndDate).getTime()
  })
  suspendedCustomers.sort((a, b) => a.customer.commercialName.localeCompare(b.customer.commercialName))

  return {
    overdueCustomers,
    gracePeriodCustomers,
    suspendedCustomers,
  }
}

export default async function CollectionsPage() {
  const { overdueCustomers, gracePeriodCustomers, suspendedCustomers } =
    await getCollectionsData()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Collections</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage outstanding service periods and collections
        </p>
      </div>

      {/* Overdue Customers */}
      <Card>
        <CardHeader>
          <CardTitle>Overdue Customers</CardTitle>
        </CardHeader>
        <CardContent>
          {overdueCustomers.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No overdue customers</p>
          ) : (
            <div className="space-y-4">
              {overdueCustomers.map(({ customer, periods, agreement, daysOverdue }) => (
                <CollectionsCustomerRow
                  key={customer.id}
                  customer={customer}
                  periods={periods}
                  agreement={agreement}
                  daysOverdue={daysOverdue}
                  allCustomerPeriods={customer.servicePeriods}
                  payments={customer.payments}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Grace Period Customers */}
      <Card>
        <CardHeader>
          <CardTitle>Customers in Grace Period</CardTitle>
        </CardHeader>
        <CardContent>
          {gracePeriodCustomers.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No customers in grace period</p>
          ) : (
            <div className="space-y-4">
              {gracePeriodCustomers.map(({ customer, periods, agreement, daysOverdue }) => (
                <CollectionsCustomerRow
                  key={customer.id}
                  customer={customer}
                  periods={periods}
                  agreement={agreement}
                  daysOverdue={daysOverdue}
                  allCustomerPeriods={customer.servicePeriods}
                  payments={customer.payments}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Suspended Customers */}
      <Card>
        <CardHeader>
          <CardTitle>Suspended Customers</CardTitle>
        </CardHeader>
        <CardContent>
          {suspendedCustomers.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No suspended customers</p>
          ) : (
            <div className="space-y-4">
              {suspendedCustomers.map(({ customer, periods, agreement, daysOverdue }) => (
                <CollectionsCustomerRow
                  key={customer.id}
                  customer={customer}
                  periods={periods}
                  agreement={agreement}
                  daysOverdue={daysOverdue}
                  allCustomerPeriods={customer.servicePeriods}
                  payments={customer.payments}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
