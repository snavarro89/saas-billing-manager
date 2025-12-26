"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/Card"
import { Button } from "@/components/ui/Button"
import Link from "next/link"

export default function NewCustomerPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    commercialName: "",
    alias: "",
    adminContact: "",
    billingContact: "",
    notes: "",
    legalName: "",
    rfc: "",
    fiscalRegime: "",
    cfdiUsage: "",
    billingEmail: "",
    invoiceRequired: false,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch("/api/customers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        throw new Error("Failed to create customer")
      }

      const customer = await res.json()
      router.push(`/customers/${customer.id}`)
    } catch (error) {
      alert("Error creating customer")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/customers" className="text-blue-600 hover:text-blue-800 text-sm">
          ← Back to Customers
        </Link>
        <h1 className="text-3xl font-bold text-gray-900 mt-2">New Customer</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Commercial Information */}
          <Card>
            <CardHeader>
              <CardTitle>Commercial Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Commercial Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.commercialName}
                  onChange={(e) =>
                    setFormData({ ...formData, commercialName: e.target.value })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Alias
                </label>
                <input
                  type="text"
                  value={formData.alias}
                  onChange={(e) =>
                    setFormData({ ...formData, alias: e.target.value })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Admin Contact
                </label>
                <input
                  type="text"
                  value={formData.adminContact}
                  onChange={(e) =>
                    setFormData({ ...formData, adminContact: e.target.value })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Billing Contact
                </label>
                <input
                  type="text"
                  value={formData.billingContact}
                  onChange={(e) =>
                    setFormData({ ...formData, billingContact: e.target.value })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Notes
                </label>
                <textarea
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData({ ...formData, notes: e.target.value })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                  rows={3}
                />
              </div>
            </CardContent>
          </Card>

          {/* Fiscal Information */}
          <Card>
            <CardHeader>
              <CardTitle>Fiscal Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Legal Name
                </label>
                <input
                  type="text"
                  value={formData.legalName}
                  onChange={(e) =>
                    setFormData({ ...formData, legalName: e.target.value })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  RFC
                </label>
                <input
                  type="text"
                  value={formData.rfc}
                  onChange={(e) =>
                    setFormData({ ...formData, rfc: e.target.value.toUpperCase() })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md font-mono"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Fiscal Regime
                </label>
                <input
                  type="text"
                  value={formData.fiscalRegime}
                  onChange={(e) =>
                    setFormData({ ...formData, fiscalRegime: e.target.value })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  CFDI Usage
                </label>
                <input
                  type="text"
                  value={formData.cfdiUsage}
                  onChange={(e) =>
                    setFormData({ ...formData, cfdiUsage: e.target.value })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Billing Email
                </label>
                <input
                  type="email"
                  value={formData.billingEmail}
                  onChange={(e) =>
                    setFormData({ ...formData, billingEmail: e.target.value })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="invoiceRequired"
                  checked={formData.invoiceRequired}
                  onChange={(e) =>
                    setFormData({ ...formData, invoiceRequired: e.target.checked })
                  }
                  className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                />
                <label htmlFor="invoiceRequired" className="ml-2 block text-sm text-gray-700">
                  Invoice required to receive payment
                </label>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="mt-6 flex gap-4">
          <Button type="submit" disabled={loading}>
            {loading ? "Creating..." : "Create Customer"}
          </Button>
          <Link href="/customers">
            <Button type="button" variant="outline">
              Cancel
            </Button>
          </Link>
        </div>
      </form>
    </div>
  )
}

