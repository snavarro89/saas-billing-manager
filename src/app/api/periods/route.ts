import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { calculateCustomerStatuses, updatePeriodStatuses } from "@/lib/status-calculator"
import type { PeriodStatus } from "@/types"

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      customerId,
      startDate,
      endDate,
      subtotalAmount,
      currency,
      origin,
      notes,
      suggestedInvoiceDate,
      planId,
      planSnapshot,
      quantity,
      frequency,
    } = body

    // Validate required fields
    if (!customerId || !startDate || !endDate) {
      return NextResponse.json(
        { error: "Missing required fields: customerId, startDate, endDate" },
        { status: 400 }
      )
    }

    // Default subtotalAmount to 0 if not provided
    const periodSubtotal = subtotalAmount !== undefined ? parseFloat(subtotalAmount) : 0

    // Verify customer exists and get invoiceRequired setting
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
    })

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      )
    }

    // Determine period status based on dates
    const today = new Date()
    const start = new Date(startDate)
    const end = new Date(endDate)
    let periodStatus: PeriodStatus = "ACTIVE"

    if (end < today) {
      periodStatus = "EXPIRED"
    } else if (start > today) {
      periodStatus = "ACTIVE" // Future period
    } else {
      // Current period - check if expiring soon (within 7 days)
      const daysUntilExpiry = Math.floor((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
      if (daysUntilExpiry <= 7 && daysUntilExpiry > 0) {
        periodStatus = "EXPIRING"
      }
    }

    // Calculate tax (16% IVA - should be configurable)
    const taxRate = 0.16
    const taxAmount = periodSubtotal * taxRate
    const totalAmount = periodSubtotal + taxAmount

    // Create the service period
    const period = await prisma.servicePeriod.create({
      data: {
        customerId,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        subtotalAmount: periodSubtotal,
        currency: currency || "MXN",
        origin: origin || "MANUAL_EXTENSION",
        status: periodStatus,
        billingStatus: "PENDING",
        suggestedInvoiceDate: suggestedInvoiceDate ? new Date(suggestedInvoiceDate) : new Date(startDate),
        notes,
        planId: planId || null,
        planSnapshot: planSnapshot || null,
        quantity: quantity ? parseFloat(quantity) : null,
        frequency: frequency || null,
        // Create invoice if customer requires invoices
        ...(customer.invoiceRequired ? {
          invoice: {
            create: {
              customerId,
              subtotalAmount: periodSubtotal,
              taxAmount,
              totalAmount,
              currency: currency || "MXN",
              status: "PENDING",
            }
          }
        } : {}),
      },
    })

    // Update period statuses for this customer
    await updatePeriodStatuses(customerId)

    // Recalculate customer status
    const statuses = await calculateCustomerStatuses(customerId)
    await prisma.customer.update({
      where: { id: customerId },
      data: {
        operationalStatus: statuses.operationalStatus,
      },
    })

    return NextResponse.json(period)
  } catch (error) {
    console.error("Error creating service period:", error)
    return NextResponse.json(
      { error: "Failed to create service period" },
      { status: 500 }
    )
  }
}

