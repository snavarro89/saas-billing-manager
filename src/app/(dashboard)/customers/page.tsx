import { prisma } from "@/lib/db"
import { StatusBadge } from "@/components/status/StatusBadge"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { format } from "date-fns"
import { calculateDaysOverdue, calculateOperationalStatus } from "@/lib/status-calculator"

async function getCustomers(searchParams: { [key: string]: string | string[] | undefined }) {
  const operationalStatus = searchParams.operationalStatus as string | undefined
  const relationshipStatus = searchParams.relationshipStatus as string | undefined
  const billingStatus = searchParams.billingStatus as string | undefined
  const search = searchParams.search as string | undefined

  const where: any = {
    isDeleted: false,
  }

  if (operationalStatus) {
    where.operationalStatus = operationalStatus
  }

  if (relationshipStatus) {
    where.relationshipStatus = relationshipStatus
  }

  if (search) {
    where.OR = [
      { commercialName: { contains: search, mode: "insensitive" } },
      { alias: { contains: search, mode: "insensitive" } },
      { legalName: { contains: search, mode: "insensitive" } },
    ]
  }

  const customers = await prisma.customer.findMany({
    where,
    include: {
      agreements: {
        where: { isActive: true },
        orderBy: { startDate: "desc" },
        take: 1,
      },
      servicePeriods: {
        orderBy: { startDate: "desc" },
        take: 1,
      },
    },
    orderBy: { commercialName: "asc" },
  })

  // Recalculate and update operational status for each customer
  for (const customer of customers) {
    const calculatedStatus = await calculateOperationalStatus(
      customer.id,
      customer.servicePeriods,
      customer.operationalStatus
    )
    
    // Update in database if different
    if (calculatedStatus !== customer.operationalStatus) {
      await prisma.customer.update({
        where: { id: customer.id },
        data: { operationalStatus: calculatedStatus },
      })
      // Update the in-memory object for display
      customer.operationalStatus = calculatedStatus
    }
  }

  // Filter by billing status if provided
  let filteredCustomers = customers
  if (billingStatus) {
    filteredCustomers = customers.filter((customer) => {
      return customer.servicePeriods.some(
        (period) => period.billingStatus === billingStatus
      )
    })
  }

  return filteredCustomers
}

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedSearchParams = await searchParams
  const customers = await getCustomers(resolvedSearchParams)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Customers</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage customer accounts and agreements
          </p>
        </div>
        <Link href="/customers/new">
          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
            New Customer
          </button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Customer List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Subtotal
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Cycle
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Service End
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Days Overdue
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {customers.map((customer) => {
                  const agreement = customer.agreements[0]
                  const lastPeriod = customer.servicePeriods[0]
                  const daysOverdue = lastPeriod
                    ? calculateDaysOverdue([lastPeriod], agreement)
                    : null

                  return (
                    <tr key={customer.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/customers/${customer.id}`}
                          className="text-blue-600 hover:text-blue-800 font-medium"
                        >
                          {customer.commercialName}
                        </Link>
                        {customer.alias && (
                          <div className="text-sm text-gray-500">
                            {customer.alias}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {agreement
                          ? `${agreement.currency} ${agreement.subtotalAmount.toFixed(2)}`
                          : "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {agreement ? agreement.billingCycle : "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {lastPeriod
                          ? format(new Date(lastPeriod.endDate), "MMM d, yyyy")
                          : "—"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge
                          status={customer.operationalStatus || "ACTIVE"}
                        />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {daysOverdue !== null ? (
                          <span className="text-red-600 font-medium">
                            {daysOverdue} days
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

