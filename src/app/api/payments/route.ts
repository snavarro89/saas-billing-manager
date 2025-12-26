import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
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
      currency,
      method,
      reference,
      screenshotUrl,
      invoiceId,
      notes,
      servicePeriodIds, // Array of service period IDs to link this payment to
    } = body

    // Validate required fields
    if (!customerId || !paymentDate || !amount || !method) {
      return NextResponse.json(
        { error: "Missing required fields: customerId, paymentDate, amount, method" },
        { status: 400 }
      )
    }

    // Verify customer exists
    const customer = await prisma.customer.findUnique({
      where: { id: customerId },
      include: {
        agreements: {
          where: { isActive: true },
          orderBy: { startDate: "desc" },
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

    // Validate invoice requirements and get periods if customer requires invoices
    let periods: any[] = []
    if (servicePeriodIds && Array.isArray(servicePeriodIds) && servicePeriodIds.length > 0) {
      periods = await prisma.servicePeriod.findMany({
        where: {
          id: { in: servicePeriodIds },
          customerId,
        },
        include: {
          invoice: true,
        },
      })

      if (periods.length !== servicePeriodIds.length) {
        return NextResponse.json(
          { error: "One or more service periods not found or don't belong to this customer" },
          { status: 400 }
        )
      }

      // If customer requires invoices, validate invoice requirements
      if (customer.invoiceRequired) {
        // Check that all periods have invoices
        const periodsWithoutInvoices = periods.filter(p => !p.invoice)
        if (periodsWithoutInvoices.length > 0) {
          return NextResponse.json(
            { error: "All service periods must have invoices before payment can be registered. Please generate invoices first." },
            { status: 400 }
          )
        }

        // Check that all invoices are GENERATED (not PENDING)
        const pendingInvoices = periods.filter(p => p.invoice && p.invoice.status !== "GENERATED")
        if (pendingInvoices.length > 0) {
          return NextResponse.json(
            { error: "All invoices must be generated before payment can be registered. Please mark invoices as generated first." },
            { status: 400 }
          )
        }
      }
    }

    // Get currency from agreement or use provided/default
    const agreement = customer.agreements[0]
    const paymentCurrency = currency || agreement?.currency || "MXN"

    // Create payment
    const payment = await prisma.payment.create({
      data: {
        customerId,
        paymentDate: new Date(paymentDate),
        amount: parseFloat(amount),
        currency: paymentCurrency,
        method,
        reference,
        screenshotUrl: screenshotUrl || null,
        invoiceId: invoiceId || null,
        notes,
        status: "CONFIRMED",
      },
    })

    // Link payment to service periods if provided
    if (servicePeriodIds && Array.isArray(servicePeriodIds) && servicePeriodIds.length > 0) {
      // Periods were already fetched and validated above
      // For invoice-required customers, link payment to invoice if provided
      // If not provided but invoice exists, link to the first period's invoice
      let paymentInvoiceId = invoiceId || null
      if (customer.invoiceRequired && !paymentInvoiceId && periods.length > 0) {
        const firstPeriod = periods[0]
        if (firstPeriod?.invoice) {
          paymentInvoiceId = firstPeriod.invoice.id
        }
      }

      // For non-invoice-required customers, automatically create invoices for periods that don't have one
      if (!customer.invoiceRequired) {
        for (const period of periods) {
          // Check if period already has an invoice
          const periodWithInvoice = await prisma.servicePeriod.findUnique({
            where: { id: period.id },
            include: { invoice: true },
          })

          if (!periodWithInvoice?.invoice) {
            // Calculate tax (16% IVA - should be configurable)
            const taxRate = 0.16
            const taxAmount = period.subtotalAmount * taxRate
            const totalAmount = period.subtotalAmount + taxAmount

            // Create invoice automatically
            const newInvoice = await prisma.invoice.create({
              data: {
                customerId: customer.id,
                servicePeriodId: period.id,
                subtotalAmount: period.subtotalAmount,
                taxAmount,
                totalAmount,
                currency: period.currency || "MXN",
                status: "PENDING",
              },
            })

            // Link payment to the first invoice created
            if (!paymentInvoiceId) {
              paymentInvoiceId = newInvoice.id
            }

            // Update service period billing status
            await prisma.servicePeriod.update({
              where: { id: period.id },
              data: {
                billingStatus: "PENDING",
              },
            })
          } else if (!paymentInvoiceId) {
            // Period already has invoice, link payment to it
            paymentInvoiceId = periodWithInvoice.invoice.id
          }
        }
      }

      // Update payment with invoice link if applicable
      if (paymentInvoiceId) {
        await prisma.payment.update({
          where: { id: payment.id },
          data: { invoiceId: paymentInvoiceId },
        })
      }

      // Create PaymentPeriod links
      for (const periodId of servicePeriodIds) {
        await prisma.paymentPeriod.create({
          data: {
            paymentId: payment.id,
            servicePeriodId: periodId,
          },
        })
      }
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

