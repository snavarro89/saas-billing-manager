import type {
  Customer,
  CommercialAgreement,
  ServicePeriod,
  Payment,
  OperationalStatus,
  RelationshipStatus,
  BillingStatus,
  PaymentStatus,
  PeriodStatus,
  BillingCycle,
  CustomerType,
  PeriodOrigin
} from '@/generated/prisma'

export type {
  Customer,
  CommercialAgreement,
  ServicePeriod,
  Payment,
  OperationalStatus,
  RelationshipStatus,
  BillingStatus,
  PaymentStatus,
  PeriodStatus,
  BillingCycle,
  CustomerType,
  PeriodOrigin
}

export interface CustomerWithRelations extends Customer {
  agreements: CommercialAgreement[]
  servicePeriods: ServicePeriod[]
  payments: Payment[]
}

export interface DashboardStats {
  expiredCount: number
  expiringCount: number
  suspendedCount: number
  pendingInvoicesCount: number
  paymentsExpectedToday: number
  paymentsExpectedThisWeek: number
}

export interface PaymentInput {
  customerId: string
  paymentDate: Date
  amount: number
  method: string
  reference?: string
  notes?: string
}

export interface ServicePeriodInput {
  customerId: string
  startDate: Date
  endDate: Date
  origin: PeriodOrigin
  subtotalAmount: number
  notes?: string
  suggestedInvoiceDate?: Date
}

