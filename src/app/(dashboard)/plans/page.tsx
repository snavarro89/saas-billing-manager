import { prisma } from "@/lib/db"
import { StatusBadge } from "@/components/status/StatusBadge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import Link from "next/link"
import { Button } from "@/components/ui/Button"

async function getPlans(searchParams: { [key: string]: string | string[] | undefined }) {
  const isActive = searchParams.isActive as string | undefined
  const type = searchParams.type as string | undefined

  const where: any = {}
  if (isActive !== undefined) {
    where.isActive = isActive === "true"
  }
  if (type) {
    where.type = type
  }

  const plans = await prisma.plan.findMany({
    where,
    include: {
      pricing: {
        orderBy: { frequency: "asc" },
      },
      usageLimits: {
        orderBy: { concept: "asc" },
      },
    },
    orderBy: { name: "asc" },
  })

  return plans
}

export default async function PlansPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
  const resolvedSearchParams = await searchParams
  const plans = await getPlans(resolvedSearchParams)

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Plans</h1>
          <p className="mt-2 text-sm text-gray-600">
            Manage service period plans and pricing
          </p>
        </div>
        <Link href="/plans/new">
          <Button>New Plan</Button>
        </Link>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <Link
              href="/plans"
              className={`px-4 py-2 rounded-md ${
                resolvedSearchParams.isActive === undefined
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              All
            </Link>
            <Link
              href="/plans?isActive=true"
              className={`px-4 py-2 rounded-md ${
                resolvedSearchParams.isActive === "true"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Active
            </Link>
            <Link
              href="/plans?isActive=false"
              className={`px-4 py-2 rounded-md ${
                resolvedSearchParams.isActive === "false"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Inactive
            </Link>
            <Link
              href="/plans?type=PER_USER"
              className={`px-4 py-2 rounded-md ${
                resolvedSearchParams.type === "PER_USER"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Per User
            </Link>
            <Link
              href="/plans?type=USAGE_BASED"
              className={`px-4 py-2 rounded-md ${
                resolvedSearchParams.type === "USAGE_BASED"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Usage Based
            </Link>
          </div>
        </CardContent>
      </Card>

      {/* Plans List */}
      <Card>
        <CardHeader>
          <CardTitle>Plans List</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Code
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Pricing
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
                {plans.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-4 text-center text-gray-500">
                      No plans found
                    </td>
                  </tr>
                ) : (
                  plans.map((plan) => (
                    <tr key={plan.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="font-mono text-sm font-medium text-gray-900">
                          {plan.code}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {plan.name}
                        </div>
                        {plan.description && (
                          <div className="text-xs text-gray-500">
                            {plan.description}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="text-sm text-gray-900">
                          {plan.type === "PER_USER" ? "Per User" : "Usage Based"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">
                          {plan.pricing.length > 0 ? (
                            <div className="space-y-1">
                              {plan.pricing.map((p) => (
                                <div key={p.id}>
                                  {p.frequency}: {p.currency} {p.price.toFixed(2)}
                                </div>
                              ))}
                            </div>
                          ) : (
                            <span className="text-gray-400">No pricing</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <StatusBadge status={plan.isActive ? "ACTIVE" : "INACTIVE"} />
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link href={`/plans/${plan.id}`}>
                          <Button variant="outline" size="sm">
                            Edit
                          </Button>
                        </Link>
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

