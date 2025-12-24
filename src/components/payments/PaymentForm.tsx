"use client"

import { useState } from "react"
import { Button } from "@/components/ui/Button"
import { useRouter } from "next/navigation"

interface PaymentFormProps {
  customerId: string
}

export function PaymentForm({ customerId }: PaymentFormProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [formData, setFormData] = useState({
    paymentDate: new Date().toISOString().split("T")[0],
    amount: "",
    method: "transfer",
    reference: "",
    notes: "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          ...formData,
          amount: parseFloat(formData.amount),
        }),
      })

      if (!res.ok) {
        throw new Error("Failed to create payment")
      }

      router.refresh()
      setIsOpen(false)
      setFormData({
        paymentDate: new Date().toISOString().split("T")[0],
        amount: "",
        method: "transfer",
        reference: "",
        notes: "",
      })
    } catch (error) {
      alert("Error creating payment")
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) {
    return (
      <Button onClick={() => setIsOpen(true)}>Register Payment</Button>
    )
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full">
        <h2 className="text-xl font-bold mb-4">Register Payment</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Payment Date
            </label>
            <input
              type="date"
              required
              value={formData.paymentDate}
              onChange={(e) =>
                setFormData({ ...formData, paymentDate: e.target.value })
              }
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Amount
            </label>
            <input
              type="number"
              step="0.01"
              required
              value={formData.amount}
              onChange={(e) =>
                setFormData({ ...formData, amount: e.target.value })
              }
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Method
            </label>
            <select
              required
              value={formData.method}
              onChange={(e) =>
                setFormData({ ...formData, method: e.target.value })
              }
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            >
              <option value="transfer">Transfer</option>
              <option value="cash">Cash</option>
              <option value="check">Check</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Reference (optional)
            </label>
            <input
              type="text"
              value={formData.reference}
              onChange={(e) =>
                setFormData({ ...formData, reference: e.target.value })
              }
              className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">
              Notes (optional)
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
          <div className="flex gap-2 justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Processing..." : "Register Payment"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

