import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { calculateCustomerStatuses } from "@/lib/status-calculator"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const resolvedParams = await params
    const customer = await prisma.customer.findUnique({
      where: { id: resolvedParams.id },
      include: {
        agreements: {
          orderBy: { startDate: "desc" },
        },
        servicePeriods: {
          orderBy: { startDate: "desc" },
          include: {
            invoice: true,
          },
        },
        payments: {
          orderBy: { paymentDate: "desc" },
          include: {
            invoice: true,
            paymentPeriods: {
              include: {
                servicePeriod: {
                  include: {
                    invoice: true,
                  },
                },
              },
            },
          },
        },
      },
    })

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      )
    }

    // Calculate statuses
    const statuses = await calculateCustomerStatuses(resolvedParams.id)
    
    // Update customer status if it's auto-calculated
    if (statuses.operationalStatus !== customer.operationalStatus) {
      await prisma.customer.update({
        where: { id: resolvedParams.id },
        data: { operationalStatus: statuses.operationalStatus },
      })
      customer.operationalStatus = statuses.operationalStatus
    }

    return NextResponse.json({ ...customer, statuses })
  } catch (error) {
    console.error("Error fetching customer:", error)
    return NextResponse.json(
      { error: "Failed to fetch customer" },
      { status: 500 }
    )
  }
}

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
    const {
      commercialName,
      alias,
      adminContact,
      billingContact,
      notes,
      legalName,
      rfc,
      fiscalRegime,
      cfdiUsage,
      billingEmail,
      invoiceRequired,
      operationalStatus,
      relationshipStatus,
    } = body

    // Build update data object with only provided fields
    const updateData: any = {}
    if (commercialName !== undefined) updateData.commercialName = commercialName
    if (alias !== undefined) updateData.alias = alias
    if (adminContact !== undefined) updateData.adminContact = adminContact
    if (billingContact !== undefined) updateData.billingContact = billingContact
    if (notes !== undefined) updateData.notes = notes
    if (legalName !== undefined) updateData.legalName = legalName
    if (rfc !== undefined) updateData.rfc = rfc
    if (fiscalRegime !== undefined) updateData.fiscalRegime = fiscalRegime
    if (cfdiUsage !== undefined) updateData.cfdiUsage = cfdiUsage
    if (billingEmail !== undefined) updateData.billingEmail = billingEmail
    if (invoiceRequired !== undefined) updateData.invoiceRequired = invoiceRequired
    if (operationalStatus !== undefined) updateData.operationalStatus = operationalStatus
    if (relationshipStatus !== undefined) updateData.relationshipStatus = relationshipStatus

    const customer = await prisma.customer.update({
      where: { id: resolvedParams.id },
      data: updateData,
    })

    return NextResponse.json(customer)
  } catch (error) {
    console.error("Error updating customer:", error)
    return NextResponse.json(
      { error: "Failed to update customer" },
      { status: 500 }
    )
  }
}

