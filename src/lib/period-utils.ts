import { addMonths, addDays, differenceInDays } from "date-fns"
import type { BillingCycle } from "@/types"

/**
 * Calculate the new start and end dates when renewing a service period
 * based on the duration of the current period
 */
export function calculateRenewalDates(
  currentStartDate: Date,
  currentEndDate: Date
): { startDate: Date; endDate: Date } {
  // Calculate the duration of the current period in days
  const durationDays = differenceInDays(currentEndDate, currentStartDate)
  
  // New period starts when current period ends
  const newStartDate = new Date(currentEndDate)
  newStartDate.setHours(0, 0, 0, 0)
  
  // New period ends after the same duration
  const newEndDate = addDays(newStartDate, durationDays)
  
  return {
    startDate: newStartDate,
    endDate: newEndDate
  }
}

/**
 * Calculate the new end date when renewing a service period
 * based on the billing cycle (deprecated - use calculateRenewalDates instead)
 */
export function calculateRenewalEndDate(
  currentEndDate: Date,
  billingCycle: BillingCycle
): Date {
  const endDate = new Date(currentEndDate)
  
  switch (billingCycle) {
    case "MONTHLY":
      return addMonths(endDate, 1)
    case "QUARTERLY":
      return addMonths(endDate, 3)
    case "SEMI_ANNUAL":
      return addMonths(endDate, 6)
    case "CUSTOM":
      // For custom cycles, default to 1 month
      // User can adjust manually
      return addMonths(endDate, 1)
    default:
      return addMonths(endDate, 1)
  }
}

/**
 * Get the number of months for a billing cycle
 */
export function getBillingCycleMonths(billingCycle: BillingCycle): number {
  switch (billingCycle) {
    case "MONTHLY":
      return 1
    case "QUARTERLY":
      return 3
    case "SEMI_ANNUAL":
      return 6
    case "CUSTOM":
      return 1 // Default for custom
    default:
      return 1
  }
}

/**
 * Calculate end date based on start date and frequency
 */
export function calculateEndDateFromFrequency(
  startDate: Date,
  frequency: BillingCycle
): Date {
  switch (frequency) {
    case "MONTHLY":
      return addMonths(startDate, 1)
    case "QUARTERLY":
      return addMonths(startDate, 3)
    case "SEMI_ANNUAL":
      return addMonths(startDate, 6)
    case "CUSTOM":
      // For custom, default to 1 month (user can adjust manually)
      return addMonths(startDate, 1)
    default:
      return addMonths(startDate, 1)
  }
}

