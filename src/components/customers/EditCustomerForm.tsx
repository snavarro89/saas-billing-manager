"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/Button"
import { useRouter } from "next/navigation"
import type { Customer } from "@/types"

interface EditCustomerFormProps {
  customer: Customer
  onSuccess?: () => void
}

export function EditCustomerForm({ customer, onSuccess }: EditCustomerFormProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  
  const [formData, setFormData] = useState({
    commercialName: customer.commercialName || "",
    alias: customer.alias || "",
    adminContact: customer.adminContact || "",
    billingContact: customer.billingContact || "",
    notes: customer.notes || "",
    legalName: customer.legalName || "",
    rfc: customer.rfc || "",
    fiscalRegime: customer.fiscalRegime || "",
    cfdiUsage: customer.cfdiUsage || "",
    billingEmail: customer.billingEmail || "",
  })

  // Update form data when customer changes
  useEffect(() => {
    setFormData({
      commercialName: customer.commercialName || "",
      alias: customer.alias || "",
      adminContact: customer.adminContact || "",
      billingContact: customer.billingContact || "",
      notes: customer.notes || "",
      legalName: customer.legalName || "",
      rfc: customer.rfc || "",
      fiscalRegime: customer.fiscalRegime || "",
      cfdiUsage: customer.cfdiUsage || "",
      billingEmail: customer.billingEmail || "",
    })
  }, [customer])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch(`/api/customers/${customer.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!res.ok) {
        const error = await res.json()
        throw new Error(error.error || "Failed to update customer")
      }

      router.refresh()
      setIsOpen(false)
      onSuccess?.()
    } catch (error: any) {
      alert(error.message || "Error updating customer")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)} variant="outline">
        Edit Customer
      </Button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Edit Customer Information</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Commercial Information */}
          <div className="border-b pb-4">
            <h3 className="text-lg font-semibold mb-3">Commercial Information</h3>
            <div className="space-y-4">
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
            </div>
          </div>

          {/* Fiscal Information */}
          <div>
            <h3 className="text-lg font-semibold mb-3">Fiscal Information</h3>
            <div className="space-y-4">
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
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
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
                    setFormData({ ...formData, rfc: e.target.value })
                  }
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md font-mono text-sm"
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
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

