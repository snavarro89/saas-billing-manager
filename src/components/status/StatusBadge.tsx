import { cn } from "@/lib/utils"
import type { OperationalStatus, RelationshipStatus, BillingStatus, PaymentStatus, PeriodStatus } from "@/types"

interface StatusBadgeProps {
  status: OperationalStatus | RelationshipStatus | BillingStatus | PaymentStatus | PeriodStatus | string
  className?: string
}

const statusColors: Record<string, string> = {
  // Operational Status
  ACTIVE: "bg-green-100 text-green-800 border-green-200",
  ACTIVE_WITH_DEBT: "bg-yellow-100 text-yellow-800 border-yellow-200",
  SUSPENDED: "bg-red-100 text-red-800 border-red-200",
  CANCELLED: "bg-gray-100 text-gray-800 border-gray-200",
  LOST_CUSTOMER: "bg-gray-100 text-gray-800 border-gray-200",
  
  // Relationship Status
  UNDER_FOLLOW_UP: "bg-yellow-100 text-yellow-800 border-yellow-200",
  SUSPENDED_NON_PAYMENT: "bg-red-100 text-red-800 border-red-200",
  SUSPENDED_NEGOTIATION: "bg-orange-100 text-orange-800 border-orange-200",
  CANCELLED_VOLUNTARILY: "bg-gray-100 text-gray-800 border-gray-200",
  LOST_NO_RESPONSE: "bg-gray-100 text-gray-800 border-gray-200",
  ELIGIBLE_FOR_DELETION: "bg-gray-100 text-gray-800 border-gray-200",
  
  // Billing Status
  PENDING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  INVOICED: "bg-green-100 text-green-800 border-green-200",
  NOT_APPLICABLE: "bg-gray-100 text-gray-800 border-gray-200",
  
  // Payment Status
  CONFIRMED: "bg-green-100 text-green-800 border-green-200",
  REVERTED: "bg-red-100 text-red-800 border-red-200",
  
  // Period Status
  EXPIRING: "bg-yellow-100 text-yellow-800 border-yellow-200",
  EXPIRED: "bg-red-100 text-red-800 border-red-200",
  
  // Financial Status
  PAID: "bg-green-100 text-green-800 border-green-200",
  OVERDUE: "bg-red-100 text-red-800 border-red-200",
  NO_ACTIVE_AGREEMENT: "bg-gray-100 text-gray-800 border-gray-200",
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const colorClass = statusColors[status] || "bg-gray-100 text-gray-800 border-gray-200"
  
  return (
    <span
      className={cn(
        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border",
        colorClass,
        className
      )}
    >
      {formatStatus(status)}
    </span>
  )
}

function formatStatus(status: string): string {
  return status
    .split("_")
    .map(word => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ")
}

