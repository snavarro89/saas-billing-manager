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
    const { paymentId } = body

    if (!paymentId) {
      return NextResponse.json(
        { error: "Payment ID is required" },
        { status: 400 }
      )
    }

    // Verify payment exists and belongs to the same customer
    const invoice = await prisma.invoice.findUnique({
      where: { id: resolvedParams.id },
      include: { customer: true },
    })

    if (!invoice) {
      return NextResponse.json(
        { error: "Invoice not found" },
        { status: 404 }
      )
    }

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

    // Update invoice with payment link
    const updatedInvoice = await prisma.invoice.update({
      where: { id: resolvedParams.id },
      data: {
        status: "PAID",
        paidDate: new Date(),
        paidByPaymentId: paymentId,
      },
    })

    // Also link payment to invoice if not already linked
    if (!payment.invoiceId) {
      await prisma.payment.update({
        where: { id: paymentId },
        data: { invoiceId: resolvedParams.id },
      })
    }

    return NextResponse.json(updatedInvoice)
  } catch (error) {
    console.error("Error marking invoice as paid:", error)
    return NextResponse.json(
      { error: "Failed to mark invoice as paid" },
      { status: 500 }
    )
  }
}

