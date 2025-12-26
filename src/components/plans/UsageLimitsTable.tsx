"use client"

import { useState } from "react"
import { Button } from "@/components/ui/Button"

interface UsageLimit {
  id?: string
  concept: string
  limitValue: number | null
  unit: string | null
}

interface UsageLimitsTableProps {
  limits: UsageLimit[]
  onChange: (limits: UsageLimit[]) => void
  readOnly?: boolean
}

export function UsageLimitsTable({ limits, onChange, readOnly = false }: UsageLimitsTableProps) {
  const [localLimits, setLocalLimits] = useState<UsageLimit[]>(limits)

  const handleAddRow = () => {
    const newLimit: UsageLimit = { concept: "", limitValue: null, unit: null }
    const updated = [...localLimits, newLimit]
    setLocalLimits(updated)
    onChange(updated)
  }

  const handleRemoveRow = (index: number) => {
    const updated = localLimits.filter((_, i) => i !== index)
    setLocalLimits(updated)
    onChange(updated)
  }

  const handleChange = (index: number, field: keyof UsageLimit, value: string | number | null) => {
    const updated = [...localLimits]
    updated[index] = { ...updated[index], [field]: value }
    setLocalLimits(updated)
    onChange(updated)
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Usage Limits</h3>
        {!readOnly && (
          <Button type="button" onClick={handleAddRow} size="sm">
            Add Limit
          </Button>
        )}
      </div>
      
      {localLimits.length === 0 ? (
        <p className="text-sm text-gray-500">No usage limits defined</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Concept
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Limit Value
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                  Unit
                </th>
                {!readOnly && (
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {localLimits.map((limit, index) => (
                <tr key={limit.id || index}>
                  <td className="px-4 py-3">
                    {readOnly ? (
                      <span className="text-sm text-gray-900">{limit.concept}</span>
                    ) : (
                      <input
                        type="text"
                        value={limit.concept}
                        onChange={(e) => handleChange(index, "concept", e.target.value)}
                        placeholder="e.g., # of services"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                      />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {readOnly ? (
                      <span className="text-sm text-gray-900">
                        {limit.limitValue === null ? "None" : limit.limitValue}
                      </span>
                    ) : (
                      <input
                        type="number"
                        value={limit.limitValue === null ? "" : limit.limitValue}
                        onChange={(e) => {
                          const val = e.target.value === "" ? null : parseFloat(e.target.value)
                          handleChange(index, "limitValue", val)
                        }}
                        placeholder="e.g., 30"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                      />
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {readOnly ? (
                      <span className="text-sm text-gray-900">{limit.unit || "—"}</span>
                    ) : (
                      <input
                        type="text"
                        value={limit.unit || ""}
                        onChange={(e) => handleChange(index, "unit", e.target.value || null)}
                        placeholder="e.g., GB, users"
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md bg-white text-gray-900 focus:ring-blue-500 focus:border-blue-500"
                      />
                    )}
                  </td>
                  {!readOnly && (
                    <td className="px-4 py-3">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleRemoveRow(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        Remove
                      </Button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

