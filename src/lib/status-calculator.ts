import { prisma } from './db'
import { addDays, isAfter, isBefore, differenceInDays } from 'date-fns'
import type { 
  Customer, 
  ServicePeriod, 
  CommercialAgreement,
  OperationalStatus,
  RelationshipStatus 
} from '../generated/prisma/client'

export type FinancialStatus = 'PAID' | 'PENDING' | 'OVERDUE' | 'NO_ACTIVE_AGREEMENT'

export interface CustomerStatuses {
  financialStatus: FinancialStatus
  operationalStatus: OperationalStatus
  relationshipStatus: RelationshipStatus
  daysOverdue: number | null
  nextPaymentDue: Date | null
}

/**
 * Calculate financial status based on service periods and payments
 */
export function calculateFinancialStatus(
  periods: ServicePeriod[],
  agreement: CommercialAgreement | null
): FinancialStatus {
  if (!agreement || !agreement.isActive) {
    return 'NO_ACTIVE_AGREEMENT'
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0) // Normalize to start of day
  
  const activePeriod = periods.find(p => {
    const start = new Date(p.startDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(p.endDate)
    end.setHours(23, 59, 59, 999) // End of day
    return start <= today && end >= today && (p.status === 'ACTIVE' || p.status === 'EXPIRING')
  })

  if (!activePeriod) {
    return 'OVERDUE'
  }

  // Check if there's a period after the current one
  const futurePeriod = periods.find(p => {
    const periodStart = new Date(p.startDate)
    const activeEnd = new Date(activePeriod.endDate)
    return periodStart > activeEnd && (p.status === 'ACTIVE' || p.status === 'EXPIRING')
  })

  if (futurePeriod) {
    return 'PAID'
  }

  // Check if current period is expiring soon or expired
  const daysUntilExpiry = differenceInDays(activePeriod.endDate, today)
  if (daysUntilExpiry < 0) {
    return 'OVERDUE'
  }
  if (daysUntilExpiry <= 7) {
    return 'PENDING'
  }

  return 'PAID'
}

/**
 * Calculate operational status based on service periods and payment links
 * New rules:
 * - ACTIVE: Active period exists AND all periods (active, past, and future) have payments linked
 * - ACTIVE_WITH_PENDING_PAYMENT: Active period exists BUT any period (active, past, or future) has no payment linked
 * - PENDING_RENEWAL: No active period, but has past periods
 * - SUSPENDED/LOST: Only set manually, don't auto-calculate
 */
export async function calculateOperationalStatus(
  customerId: string,
  periods: ServicePeriod[],
  currentOperationalStatus: OperationalStatus | null
): Promise<OperationalStatus> {
  // If manually set to SUSPENDED or LOST, don't auto-calculate
  if (currentOperationalStatus === 'SUSPENDED' || currentOperationalStatus === 'LOST') {
    return currentOperationalStatus
  }

  // Find active period (today is between startDate and endDate)
  const today = new Date()
  today.setHours(0, 0, 0, 0) // Normalize to start of day
  
  const activePeriod = periods.find(p => {
    const start = new Date(p.startDate)
    start.setHours(0, 0, 0, 0)
    const end = new Date(p.endDate)
    end.setHours(23, 59, 59, 999) // End of day
    return start <= today && end >= today && (p.status === 'ACTIVE' || p.status === 'EXPIRING')
  })

  if (activePeriod) {
    // Check all periods that have started (not future periods that haven't begun)
    // Get all payment periods for this customer's service periods
    const allPaymentPeriods = await prisma.paymentPeriod.findMany({
      where: {
        servicePeriod: {
          customerId: customerId
        }
      },
      select: {
        servicePeriodId: true
      }
    })

    const paidPeriodIds = new Set(allPaymentPeriods.map(pp => pp.servicePeriodId))

    // Filter periods to only check those that have started (startDate <= today)
    const periodsToCheck = periods.filter(period => {
      const periodStart = new Date(period.startDate)
      periodStart.setHours(0, 0, 0, 0)
      return periodStart <= today
    })

    // Check if ALL started periods have payments
    const allStartedPeriodsPaid = periodsToCheck.length > 0 && 
      periodsToCheck.every(period => paidPeriodIds.has(period.id))

    if (allStartedPeriodsPaid) {
      // All started periods have payments, so customer is fully paid
      return 'ACTIVE'
    } else {
      // At least one started period doesn't have a payment
      return 'ACTIVE_WITH_PENDING_PAYMENT'
    }
  }

  // No active period - check if there are any past periods
  const hasPastPeriods = periods.some(p => {
    const end = new Date(p.endDate)
    return end < today
  })

  if (hasPastPeriods) {
    return 'PENDING_RENEWAL'
  }

  // No periods at all - default to ACTIVE_WITH_PENDING_PAYMENT (will be set when first period is created)
  return 'ACTIVE_WITH_PENDING_PAYMENT'
}

/**
 * Calculate days overdue
 */
export function calculateDaysOverdue(
  periods: ServicePeriod[],
  agreement: CommercialAgreement | null
): number | null {
  if (!agreement || !agreement.isActive) {
    return null
  }

  const today = new Date()
  const activePeriod = periods.find(p => {
    const start = new Date(p.startDate)
    const end = new Date(p.endDate)
    return start <= today && end >= today && p.status === 'ACTIVE'
  })

  if (!activePeriod) {
    const expiredPeriod = periods
      .filter(p => p.status === 'EXPIRED' || p.status === 'EXPIRING')
      .sort((a, b) => b.endDate.getTime() - a.endDate.getTime())[0]
    
    if (expiredPeriod && isAfter(today, expiredPeriod.endDate)) {
      return differenceInDays(today, expiredPeriod.endDate)
    }
  }

  return null
}

/**
 * Get next payment due date
 */
export function getNextPaymentDue(
  periods: ServicePeriod[],
  agreement: CommercialAgreement | null
): Date | null {
  if (!agreement || !agreement.isActive) {
    return null
  }

  const today = new Date()
  const activePeriod = periods.find(p => {
    const start = new Date(p.startDate)
    const end = new Date(p.endDate)
    return start <= today && end >= today && p.status === 'ACTIVE'
  })

  if (activePeriod) {
    return activePeriod.endDate
  }

  const lastPeriod = periods
    .sort((a, b) => b.endDate.getTime() - a.endDate.getTime())[0]
  
  if (lastPeriod) {
    return lastPeriod.endDate
  }

  return null
}

/**
 * Calculate all statuses for a customer
 */
export async function calculateCustomerStatuses(
  customerId: string
): Promise<CustomerStatuses> {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      servicePeriods: {
        orderBy: { startDate: 'desc' }
      },
      agreements: {
        where: { isActive: true },
        orderBy: { startDate: 'desc' },
        take: 1
      }
    }
  })

  if (!customer) {
    throw new Error('Customer not found')
  }

  const agreement = customer.agreements[0] || null
  const periods = customer.servicePeriods

  const financialStatus = calculateFinancialStatus(periods, agreement)
  const operationalStatus = await calculateOperationalStatus(
    customerId,
    periods,
    customer.operationalStatus
  )
  const daysOverdue = calculateDaysOverdue(periods, agreement)
  const nextPaymentDue = getNextPaymentDue(periods, agreement)

  return {
    financialStatus,
    operationalStatus,
    relationshipStatus: customer.relationshipStatus || 'ACTIVE',
    daysOverdue,
    nextPaymentDue
  }
}

/**
 * Update period statuses based on current date
 */
export async function updatePeriodStatuses(customerId?: string) {
  const today = new Date()
  
  const where = customerId ? { customerId } : {}
  
  // Mark expired periods
  await prisma.servicePeriod.updateMany({
    where: {
      ...where,
      endDate: { lt: today },
      status: { in: ['ACTIVE', 'EXPIRING'] }
    },
    data: { status: 'EXPIRED' }
  })

  // Mark expiring periods (within 7 days)
  const expiringDate = addDays(today, 7)
  await prisma.servicePeriod.updateMany({
    where: {
      ...where,
      endDate: { gte: today, lte: expiringDate },
      status: 'ACTIVE'
    },
    data: { status: 'EXPIRING' }
  })
}

