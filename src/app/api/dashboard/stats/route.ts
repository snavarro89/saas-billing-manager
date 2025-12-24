import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { updatePeriodStatuses } from "@/lib/status-calculator"
import { startOfDay, endOfDay, addDays, startOfWeek, endOfWeek } from "date-fns"

export async function GET() {
  try {
    // Update period statuses first
    await updatePeriodStatuses()

    const today = startOfDay(new Date())
    const weekEnd = endOfWeek(today)
    const expiringDate = addDays(today, 7)

    // Expired customers (periods expired, no active period)
    const expiredPeriods = await prisma.servicePeriod.findMany({
      where: {
        status: "EXPIRED",
        endDate: { lt: today },
      },
      include: {
        customer: true,
      },
    })

    const expiredCustomerIds = new Set(
      expiredPeriods.map((p) => p.customerId)
    )

    // Check which expired customers don't have active periods
    const expiredCustomers = await prisma.customer.findMany({
      where: {
        id: { in: Array.from(expiredCustomerIds) },
        isDeleted: false,
        servicePeriods: {
          none: {
            status: "ACTIVE",
            endDate: { gte: today },
          },
        },
      },
    })

    // Expiring soon (within 7 days)
    const expiringPeriods = await prisma.servicePeriod.findMany({
      where: {
        status: { in: ["ACTIVE", "EXPIRING"] },
        endDate: { gte: today, lte: expiringDate },
      },
      distinct: ["customerId"],
    })

    // Suspended customers
    const suspendedCustomers = await prisma.customer.findMany({
      where: {
        operationalStatus: "SUSPENDED",
        isDeleted: false,
      },
    })

    // Pending invoices
    const pendingInvoices = await prisma.servicePeriod.findMany({
      where: {
        billingStatus: "PENDING",
        status: { in: ["ACTIVE", "EXPIRING", "EXPIRED"] },
      },
      include: {
        customer: {
          include: {
            agreements: {
              where: { isActive: true },
              take: 1,
            },
          },
        },
      },
    })

    // Payments expected today (based on renewal day)
    const todayDay = today.getDate()
    const agreementsRenewingToday = await prisma.commercialAgreement.findMany({
      where: {
        isActive: true,
        renewalDay: todayDay,
      },
      include: {
        customer: {
          include: {
            servicePeriods: {
              where: {
                status: "ACTIVE",
              },
              orderBy: { endDate: "desc" },
              take: 1,
            },
          },
        },
      },
    })

    // Payments expected this week
    const weekStart = startOfWeek(today)
    const agreementsRenewingThisWeek = await prisma.commercialAgreement.findMany(
      {
        where: {
          isActive: true,
          renewalDay: {
            gte: weekStart.getDate(),
            lte: weekEnd.getDate(),
          },
        },
      }
    )

    return NextResponse.json({
      expiredCount: expiredCustomers.length,
      expiringCount: expiringPeriods.length,
      suspendedCount: suspendedCustomers.length,
      pendingInvoicesCount: pendingInvoices.length,
      paymentsExpectedToday: agreementsRenewingToday.length,
      paymentsExpectedThisWeek: agreementsRenewingThisWeek.length,
    })
  } catch (error) {
    console.error("Error fetching dashboard stats:", error)
    return NextResponse.json(
      { error: "Failed to fetch dashboard stats" },
      { status: 500 }
    )
  }
}

