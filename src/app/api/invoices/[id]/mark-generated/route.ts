import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const resolvedParams = await params
    const body = await request.json()
    const { invoiceNumber, invoiceUrl, paymentId } = body

    if (!invoiceNumber || !invoiceNumber.trim()) {
      return NextResponse.json(
        { error: "Invoice number is required" },
        { status: 400 }
      )
    }

    // Get invoice with customer info to check invoiceRequired
    const invoice = await prisma.invoice.findUnique({
      where: { id: resolvedParams.id },
      include: {
        customer: true,
        servicePeriod: true,
      },
    })

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      )
    }

    // For non-invoice-required customers, validate and link payment
    if (!invoice.customer.invoiceRequired && paymentId) {
      // Verify payment exists and belongs to the same customer
      const payment = await prisma.payment.findUnique({
        where: { id: paymentId },
      })

      if (!payment) {
        return NextResponse.json(
          { error: "Payment not found" },
          { status: 404 }
        )
      }

      if (payment.customerId !== invoice.customerId) {
        return NextResponse.json(
          { error: "Payment does not belong to the same customer" },
          { status: 400 }
        )
      }

      // Check if payment already has an invoice linked
      if (payment.invoiceId) {
        return NextResponse.json(
          { error: "Payment is already linked to another invoice" },
          { status: 400 }
        )
      }
    }

    // Update invoice
    const updatedInvoice = await prisma.invoice.update({
      where: { id: resolvedParams.id },
      data: {
        status: "GENERATED",
        invoiceNumber: invoiceNumber.trim(),
        invoiceUrl: invoiceUrl?.trim() || null,
        generatedDate: new Date(),
      },
    })

    // Link payment to invoice if provided (for non-invoice-required customers)
    if (!invoice.customer.invoiceRequired && paymentId) {
      await prisma.payment.update({
        where: { id: paymentId },
        data: { invoiceId: resolvedParams.id },
      })
    }

    // Also update the service period billing status
    await prisma.servicePeriod.update({
      where: { id: invoice.servicePeriodId },
      data: {
        billingStatus: "INVOICED",
      },
    })

    return NextResponse.json(updatedInvoice)
  } catch (error) {
    console.error("Error marking invoice as generated:", error)
    return NextResponse.json(
      { error: "Failed to mark invoice as generated" },
      { status: 500 }
    )
  }
}

