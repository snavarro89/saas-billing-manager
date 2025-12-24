import { format } from "date-fns"
import { StatusBadge } from "@/components/status/StatusBadge"
import type { ServicePeriod } from "@/types"

interface ServicePeriodTimelineProps {
  periods: ServicePeriod[]
}

export function ServicePeriodTimeline({ periods }: ServicePeriodTimelineProps) {
  if (periods.length === 0) {
    return <p className="text-gray-500">No service periods</p>
  }

  return (
    <div className="space-y-4">
      {periods.map((period) => (
        <div
          key={period.id}
          className="border-l-4 border-blue-500 pl-4 py-2"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="font-medium">
                {format(new Date(period.startDate), "MMM d, yyyy")} -{" "}
                {format(new Date(period.endDate), "MMM d, yyyy")}
              </p>
              <p className="text-sm text-gray-500">
                {period.origin} • {period.currency || "MXN"} {period.subtotalAmount.toFixed(2)}
              </p>
              {period.notes && (
                <p className="text-sm text-gray-600 mt-1">{period.notes}</p>
              )}
            </div>
            <div className="flex gap-2">
              <StatusBadge status={period.status} />
              <StatusBadge status={period.billingStatus} />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}

