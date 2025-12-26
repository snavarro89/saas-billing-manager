"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { EditCustomerButton } from "./EditCustomerButton"
import { EditableField } from "./EditableField"
import type { Customer } from "@/types"

interface CustomerEditFormProps {
  customer: Customer
}

export function CustomerEditForm({ customer }: CustomerEditFormProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
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
    invoiceRequired: (customer as any).invoiceRequired || false,
  })

  // Reset form data when customer changes
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
      invoiceRequired: (customer as any).invoiceRequired || false,
    })
  }, [customer])

  const handleSave = async () => {
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
      setIsEditing(false)
    } catch (error: any) {
      alert(error.message || "Error updating customer")
    } finally {
      setLoading(false)
    }
  }

  const handleCancel = () => {
    // Reset form data to original customer values
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
      invoiceRequired: (customer as any).invoiceRequired || false,
    })
    setIsEditing(false)
  }

  return (
    <div className="space-y-6">
      {/* Customer Name Header */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <div className="flex justify-between items-start">
          <div className="flex-1">
            {isEditing ? (
              <div className="space-y-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Commercial Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.commercialName}
                    onChange={(e) => setFormData({ ...formData, commercialName: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-2xl font-bold bg-white text-gray-900"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Alias
                  </label>
                  <input
                    type="text"
                    value={formData.alias}
                    onChange={(e) => setFormData({ ...formData, alias: e.target.value })}
                    className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                  />
                </div>
              </div>
            ) : (
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {formData.commercialName}
                </h1>
                {formData.alias && (
                  <p className="text-gray-600 mt-1">Alias: {formData.alias}</p>
                )}
              </div>
            )}
          </div>
          <div className="ml-4">
            <EditCustomerButton
              isEditing={isEditing}
              onEdit={() => setIsEditing(true)}
              onCancel={handleCancel}
              onSave={handleSave}
              loading={loading}
            />
          </div>
        </div>
      </div>

      {/* Commercial Information Card */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Commercial Information
          </h3>
          <div className="space-y-4">
            <EditableField
              label="Commercial Name"
              value={formData.commercialName}
              onChange={(value) => setFormData({ ...formData, commercialName: value })}
              isEditing={isEditing}
              required
            />
            <EditableField
              label="Alias"
              value={formData.alias}
              onChange={(value) => setFormData({ ...formData, alias: value })}
              isEditing={isEditing}
            />
            <EditableField
              label="Admin Contact"
              value={formData.adminContact}
              onChange={(value) => setFormData({ ...formData, adminContact: value })}
              isEditing={isEditing}
            />
            <EditableField
              label="Billing Contact"
              value={formData.billingContact}
              onChange={(value) => setFormData({ ...formData, billingContact: value })}
              isEditing={isEditing}
            />
            <EditableField
              label="Notes"
              value={formData.notes}
              onChange={(value) => setFormData({ ...formData, notes: value })}
              isEditing={isEditing}
              type="textarea"
            />
          </div>
        </div>

        {/* Fiscal Information Card */}
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-1">
            Fiscal Information
          </h3>
          <p className="text-sm text-gray-500 mb-4">For invoice preparation</p>
          <div className="space-y-4">
            <EditableField
              label="Legal Name"
              value={formData.legalName}
              onChange={(value) => setFormData({ ...formData, legalName: value })}
              isEditing={isEditing}
              className="font-mono text-sm"
            />
            <EditableField
              label="RFC"
              value={formData.rfc}
              onChange={(value) => setFormData({ ...formData, rfc: value })}
              isEditing={isEditing}
              className="font-mono text-sm"
            />
            <EditableField
              label="Fiscal Regime"
              value={formData.fiscalRegime}
              onChange={(value) => setFormData({ ...formData, fiscalRegime: value })}
              isEditing={isEditing}
            />
            <EditableField
              label="CFDI Usage"
              value={formData.cfdiUsage}
              onChange={(value) => setFormData({ ...formData, cfdiUsage: value })}
              isEditing={isEditing}
            />
            <EditableField
              label="Billing Email"
              value={formData.billingEmail}
              onChange={(value) => setFormData({ ...formData, billingEmail: value })}
              isEditing={isEditing}
              type="email"
            />
            {isEditing ? (
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
            ) : (
              <div>
                <label className="text-sm font-medium text-gray-500">Invoice Required</label>
                <p className="text-gray-900">{formData.invoiceRequired ? "Yes" : "No"}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

