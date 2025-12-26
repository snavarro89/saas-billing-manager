"use client"

interface EditableFieldProps {
  label: string
  value: string
  onChange: (value: string) => void
  isEditing: boolean
  type?: "text" | "email" | "textarea"
  required?: boolean
  className?: string
}

export function EditableField({
  label,
  value,
  onChange,
  isEditing,
  type = "text",
  required = false,
  className = "",
}: EditableFieldProps) {
  if (!isEditing) {
    return (
      <div>
        <label className="text-sm font-medium text-gray-500">{label}</label>
        <p className={`text-gray-900 ${className}`}>{value || "—"}</p>
      </div>
    )
  }

  if (type === "textarea") {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          required={required}
          className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
          rows={3}
        />
      </div>
    )
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        className={`mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900 ${className}`}
      />
    </div>
  )
}


