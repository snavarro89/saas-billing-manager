"use client"

import { useState } from "react"
import { Button } from "@/components/ui/Button"

interface EditCustomerButtonProps {
  isEditing: boolean
  onEdit: () => void
  onCancel: () => void
  onSave: () => void
  loading?: boolean
}

export function EditCustomerButton({ 
  isEditing, 
  onEdit, 
  onCancel, 
  onSave,
  loading = false
}: EditCustomerButtonProps) {
  if (isEditing) {
    return (
      <div className="flex gap-2">
        <Button
          variant="outline"
          onClick={onCancel}
          disabled={loading}
        >
          Cancel
        </Button>
        <Button
          onClick={onSave}
          disabled={loading}
        >
          {loading ? "Saving..." : "Save Changes"}
        </Button>
      </div>
    )
  }

  return (
    <Button onClick={onEdit} variant="outline">
      Edit Customer
    </Button>
  )
}


