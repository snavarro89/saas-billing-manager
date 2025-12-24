import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { calculateCustomerStatuses } from "@/lib/status-calculator"

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const customer = await prisma.customer.findUnique({
      where: { id: params.id },
      include: {
        agreements: {
          orderBy: { startDate: "desc" },
        },
        servicePeriods: {
          orderBy: { startDate: "desc" },
        },
        payments: {
          orderBy: { paymentDate: "desc" },
          include: {
            paymentPeriods: {
              include: {
                servicePeriod: true,
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

    const statuses = await calculateCustomerStatuses(params.id)

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
  { params }: { params: { id: string } }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

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
      operationalStatus,
      relationshipStatus,
    } = body

    const customer = await prisma.customer.update({
      where: { id: params.id },
      data: {
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
        operationalStatus,
        relationshipStatus,
      },
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

