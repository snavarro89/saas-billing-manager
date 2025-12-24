import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { addMonths, addDays, startOfMonth, setDate } from "date-fns"
import { updatePeriodStatuses, calculateCustomerStatuses } from "@/lib/status-calculator"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const customerId = searchParams.get("customerId")

    const where: any = {}
    if (customerId) {
      where.customerId = customerId
    }

    const payments = await prisma.payment.findMany({
      where,
      include: {
        customer: true,
        paymentPeriods: {
          include: {
            servicePeriod: true,
          },
        },
      },
      orderBy: { paymentDate: "desc" },
    })

    return NextResponse.json(payments)
  } catch (error) {
    console.error("Error fetching payments:", error)
    return NextResponse.json(
      { error: "Failed to fetch payments" },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      customerId,
      paymentDate,
      amount,
      method,
      reference,
      notes,
    } = body

    // Get customer with active agreement
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        agreements: {
          where: { isActive: true },
          orderBy: { startDate: "desc" },
          take: 1,
        },
        servicePeriods: {
          orderBy: { endDate: "desc" },
          take: 1,
        },
      },
    })

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      )
    }

    const agreement = customer.agreements[0]
    if (!agreement) {
      return NextResponse.json(
        { error: "No active agreement found" },
        { status: 400 }
      )
    }

    // Create payment
    const payment = await prisma.payment.create({
      data: {
        customerId,
        paymentDate: new Date(paymentDate),
        amount: parseFloat(amount),
        currency: agreement.currency,
        method,
        reference,
        notes,
        status: "CONFIRMED",
      },
    })

    // Calculate how many periods this payment covers
    const periodsToCreate = Math.floor(amount / agreement.subtotalAmount)
    const lastPeriod = customer.servicePeriods[0]
    const startDate = lastPeriod
      ? addDays(lastPeriod.endDate, 1)
      : new Date(paymentDate)

    // Generate service periods based on billing cycle
    const periods = []
    let currentStartDate = startDate

    for (let i = 0; i < periodsToCreate; i++) {
      let endDate: Date

      switch (agreement.billingCycle) {
        case "MONTHLY":
          endDate = addMonths(currentStartDate, 1)
          break
        case "QUARTERLY":
          endDate = addMonths(currentStartDate, 3)
          break
        case "SEMI_ANNUAL":
          endDate = addMonths(currentStartDate, 6)
          break
        default:
          // CUSTOM - default to monthly
          endDate = addMonths(currentStartDate, 1)
      }

      // Adjust end date to renewal day if specified
      if (agreement.renewalDay) {
        const monthStart = startOfMonth(endDate)
        endDate = setDate(monthStart, agreement.renewalDay)
        if (endDate <= currentStartDate) {
          endDate = addMonths(endDate, 1)
        }
      }

      const period = await prisma.servicePeriod.create({
        data: {
          customerId,
          startDate: currentStartDate,
          endDate,
          origin: "PAYMENT",
          status: "ACTIVE",
          subtotalAmount: agreement.subtotalAmount,
          currency: agreement.currency,
          billingStatus: "PENDING",
          suggestedInvoiceDate: currentStartDate,
        },
      })

      // Link period to payment
      await prisma.paymentPeriod.create({
        data: {
          paymentId: payment.id,
          servicePeriodId: period.id,
        },
      })

      periods.push(period)
      currentStartDate = addDays(endDate, 1)
    }

    // Update customer statuses
    await updatePeriodStatuses(customerId)
    const statuses = await calculateCustomerStatuses(customerId)

    // Update customer operational status
    await prisma.customer.update({
      where: { id: customerId },
      data: {
        operationalStatus: statuses.operationalStatus,
      },
    })

    // Fetch payment with relations
    const paymentWithRelations = await prisma.payment.findUnique({
      where: { id: payment.id },
      include: {
        customer: true,
        paymentPeriods: {
          include: {
            servicePeriod: true,
          },
        },
      },
    })

    return NextResponse.json(paymentWithRelations)
  } catch (error) {
    console.error("Error creating payment:", error)
    return NextResponse.json(
      { error: "Failed to create payment" },
      { status: 500 }
    )
  }
}

