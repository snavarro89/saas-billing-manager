import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card"
import Link from "next/link"
import { Button } from "@/components/ui/Button"

async function getDashboardStats() {
  // Use absolute URL for server-side fetch
  const baseUrl = process.env.NEXTAUTH_URL || 
    (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : "http://localhost:3000")
  
  try {
    const res = await fetch(`${baseUrl}/api/dashboard/stats`, {
      cache: "no-store",
    })
    if (!res.ok) {
      return null
    }
    return res.json()
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    return null
  }
}

export default async function DashboardPage() {
  const stats = await getDashboardStats()

  if (!stats) {
    return <div>Error loading dashboard</div>
  }

  const widgets = [
    {
      title: "Expired Customers",
      count: stats.expiredCount,
      description: "Customers with expired service periods",
      color: "text-red-600",
      bgColor: "bg-red-50",
      link: "/customers?operationalStatus=SUSPENDED",
    },
    {
      title: "Expiring Soon",
      count: stats.expiringCount,
      description: "Service periods expiring within 7 days",
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      link: "/customers",
    },
    {
      title: "Suspended",
      count: stats.suspendedCount,
      description: "Customers currently suspended",
      color: "text-red-600",
      bgColor: "bg-red-50",
      link: "/collections",
    },
    {
      title: "Pending Invoices",
      count: stats.pendingInvoicesCount,
      description: "Service periods pending invoice generation",
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
      link: "/billing",
    },
    {
      title: "Payments Expected Today",
      count: stats.paymentsExpectedToday,
      description: "Agreements with renewal day today",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      link: "/collections",
    },
    {
      title: "Payments Expected This Week",
      count: stats.paymentsExpectedThisWeek,
      description: "Agreements renewing this week",
      color: "text-blue-600",
      bgColor: "bg-blue-50",
      link: "/collections",
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-sm text-gray-600">
          Overview of billing and collections status
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {widgets.map((widget) => (
          <Link key={widget.title} href={widget.link}>
            <Card className="hover:shadow-md transition-shadow cursor-pointer">
              <CardHeader>
                <CardTitle className="text-lg">{widget.title}</CardTitle>
                <CardDescription>{widget.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className={`text-4xl font-bold ${widget.color} ${widget.bgColor} p-4 rounded-lg inline-block`}>
                  {widget.count}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="mt-8">
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-4">
              <Link href="/customers">
                <Button>View All Customers</Button>
              </Link>
              <Link href="/collections">
                <Button variant="outline">Collections</Button>
              </Link>
              <Link href="/billing">
                <Button variant="outline">Pending Invoices</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

