import { prisma } from './db'
import { addDays, isAfter, isBefore, differenceInDays } from 'date-fns'
import type { 
  Customer, 
  ServicePeriod, 
  CommercialAgreement,
  OperationalStatus,
  RelationshipStatus 
} from '@/generated/prisma'

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
  const activePeriod = periods.find(p => 
    isAfter(today, p.startDate) && isBefore(today, p.endDate) && p.status === 'ACTIVE'
  )

  if (!activePeriod) {
    return 'OVERDUE'
  }

  // Check if there's a period after the current one
  const futurePeriod = periods.find(p => 
    isAfter(p.startDate, activePeriod.endDate) && p.status === 'ACTIVE'
  )

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
 * Calculate operational status based on service periods and grace period
 */
export function calculateOperationalStatus(
  periods: ServicePeriod[],
  agreement: CommercialAgreement | null,
  currentOperationalStatus: OperationalStatus | null
): OperationalStatus {
  if (!agreement || !agreement.isActive) {
    return 'CANCELLED'
  }

  const today = new Date()
  const activePeriod = periods.find(p => 
    isAfter(today, p.startDate) && isBefore(today, p.endDate) && p.status === 'ACTIVE'
  )

  if (!activePeriod) {
    // Check if we're in grace period
    const expiredPeriod = periods.find(p => 
      isBefore(today, p.endDate) && p.status === 'EXPIRED'
    )
    
    if (expiredPeriod) {
      const gracePeriodEnd = addDays(expiredPeriod.endDate, agreement.gracePeriodDays)
      if (isBefore(today, gracePeriodEnd)) {
        return 'ACTIVE_WITH_DEBT'
      }
    }
    
    return 'SUSPENDED'
  }

  // Check if period is expiring soon
  const daysUntilExpiry = differenceInDays(activePeriod.endDate, today)
  if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
    // Check if there's a future period
    const futurePeriod = periods.find(p => 
      isAfter(p.startDate, activePeriod.endDate) && p.status === 'ACTIVE'
    )
    if (!futurePeriod) {
      return 'ACTIVE_WITH_DEBT'
    }
  }

  return 'ACTIVE'
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
  const activePeriod = periods.find(p => 
    isAfter(today, p.startDate) && isBefore(today, p.endDate) && p.status === 'ACTIVE'
  )

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
  const activePeriod = periods.find(p => 
    isAfter(today, p.startDate) && isBefore(today, p.endDate) && p.status === 'ACTIVE'
  )

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
  const operationalStatus = calculateOperationalStatus(
    periods,
    agreement,
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

