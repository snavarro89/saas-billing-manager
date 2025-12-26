import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function POST(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { servicePeriodId } = body

    if (!servicePeriodId) {
      return NextResponse.json(
        { error: "Missing required field: servicePeriodId" },
        { status: 400 }
      )
    }

    // Verify service period exists
    const servicePeriod = await prisma.servicePeriod.findUnique({
      where: { id: servicePeriodId },
      include: {
        customer: true,
        paymentPeriods: {
          include: {
            payment: true,
          },
        },
        invoice: true,
      },
    })

    if (!servicePeriod) {
      return NextResponse.json(
        { error: "Service period not found" },
        { status: 404 }
      )
    }

    // Check if invoice already exists
    if (servicePeriod.invoice) {
      return NextResponse.json(
        { error: "Service period already has an invoice" },
        { status: 400 }
      )
    }

    // Check if service period has at least one payment
    if (servicePeriod.paymentPeriods.length === 0) {
      return NextResponse.json(
        { error: "Service period must have at least one payment before invoice can be created" },
        { status: 400 }
      )
    }

    // Calculate tax (16% IVA - should be configurable)
    const taxRate = 0.16
    const taxAmount = servicePeriod.subtotalAmount * taxRate
    const totalAmount = servicePeriod.subtotalAmount + taxAmount

    // Create invoice
    const invoice = await prisma.invoice.create({
      data: {
        customerId: servicePeriod.customerId,
        servicePeriodId: servicePeriod.id,
        subtotalAmount: servicePeriod.subtotalAmount,
        taxAmount,
        totalAmount,
        currency: servicePeriod.currency || "MXN",
        status: "PENDING",
      },
    })

    // Update service period billing status
    await prisma.servicePeriod.update({
      where: { id: servicePeriodId },
      data: {
        billingStatus: "PENDING",
      },
    })

    // Link payment to invoice if there's a payment
    if (servicePeriod.paymentPeriods.length > 0) {
      const firstPayment = servicePeriod.paymentPeriods[0].payment
      if (firstPayment && !firstPayment.invoiceId) {
        await prisma.payment.update({
          where: { id: firstPayment.id },
          data: { invoiceId: invoice.id },
        })
      }
    }

    return NextResponse.json(invoice)
  } catch (error) {
    console.error("Error creating invoice:", error)
    return NextResponse.json(
      { error: "Failed to create invoice" },
      { status: 500 }
    )
  }
}

