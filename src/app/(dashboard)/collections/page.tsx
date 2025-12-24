import { prisma } from "@/lib/db"
import { StatusBadge } from "@/components/status/StatusBadge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { format, addDays } from "date-fns"
import Link from "next/link"
import { calculateDaysOverdue } from "@/lib/status-calculator"

async function getCollectionsData() {
  const today = new Date()
  const gracePeriodEnd = addDays(today, 30) // Look ahead 30 days for grace periods

  // Overdue customers
  const overdueCustomers = await prisma.customer.findMany({
    where: {
      isDeleted: false,
      operationalStatus: { in: ["SUSPENDED", "ACTIVE_WITH_DEBT"] },
    },
    include: {
      agreements: {
        where: { isActive: true },
        take: 1,
      },
      servicePeriods: {
        orderBy: { endDate: "desc" },
        take: 1,
      },
    },
  })

  // Customers in grace period
  const gracePeriodCustomers = await prisma.customer.findMany({
    where: {
      isDeleted: false,
      operationalStatus: "ACTIVE_WITH_DEBT",
      servicePeriods: {
        some: {
          status: "EXPIRED",
          endDate: {
            gte: today,
            lte: gracePeriodEnd,
          },
        },
      },
    },
    include: {
      agreements: {
        where: { isActive: true },
        take: 1,
      },
      servicePeriods: {
        where: { status: "EXPIRED" },
        orderBy: { endDate: "desc" },
        take: 1,
      },
    },
  })

  // Suspended customers
  const suspendedCustomers = await prisma.customer.findMany({
    where: {
      isDeleted: false,
      operationalStatus: "SUSPENDED",
    },
    include: {
      agreements: {
        where: { isActive: true },
        take: 1,
      },
      servicePeriods: {
        orderBy: { endDate: "desc" },
        take: 1,
      },
    },
  })

  return {
    overdueCustomers,
    gracePeriodCustomers,
    suspendedCustomers,
  }
}

export default async function CollectionsPage() {
  const { overdueCustomers, gracePeriodCustomers, suspendedCustomers } =
    await getCollectionsData()

  const renderCustomerRow = (customer: any) => {
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
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
          {agreement
            ? `${agreement.currency} ${agreement.subtotalAmount.toFixed(2)}`
            : "—"}
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {lastPeriod
            ? format(new Date(lastPeriod.endDate), "MMM d, yyyy")
            : "—"}
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          {daysOverdue !== null ? (
            <span className="text-red-600 font-medium">{daysOverdue} days</span>
          ) : (
            "—"
          )}
        </td>
        <td className="px-6 py-4 whitespace-nowrap">
          <StatusBadge status={customer.operationalStatus || "ACTIVE"} />
        </td>
        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
          {customer.notes || "—"}
        </td>
      </tr>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Collections</h1>
        <p className="mt-2 text-sm text-gray-600">
          Manage overdue accounts and collections
        </p>
      </div>

      {/* Overdue Customers */}
      <Card>
        <CardHeader>
          <CardTitle>Overdue Customers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Service End
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Days Overdue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {overdueCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      No overdue customers
                    </td>
                  </tr>
                ) : (
                  overdueCustomers.map(renderCustomerRow)
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Grace Period Customers */}
      <Card>
        <CardHeader>
          <CardTitle>Customers in Grace Period</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Service End
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Days Overdue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {gracePeriodCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      No customers in grace period
                    </td>
                  </tr>
                ) : (
                  gracePeriodCustomers.map(renderCustomerRow)
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Suspended Customers */}
      <Card>
        <CardHeader>
          <CardTitle>Suspended Customers</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Service End
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Days Overdue
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Notes
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {suspendedCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      No suspended customers
                    </td>
                  </tr>
                ) : (
                  suspendedCustomers.map(renderCustomerRow)
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

