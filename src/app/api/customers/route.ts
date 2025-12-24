import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function GET(request: Request) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const operationalStatus = searchParams.get("operationalStatus")
    const relationshipStatus = searchParams.get("relationshipStatus")
    const billingStatus = searchParams.get("billingStatus")
    const search = searchParams.get("search")

    const where: any = {
      isDeleted: false,
    }

    if (operationalStatus) {
      where.operationalStatus = operationalStatus
    }

    if (relationshipStatus) {
      where.relationshipStatus = relationshipStatus
    }

    if (search) {
      where.OR = [
        { commercialName: { contains: search, mode: "insensitive" } },
        { alias: { contains: search, mode: "insensitive" } },
        { legalName: { contains: search, mode: "insensitive" } },
      ]
    }

    const customers = await prisma.customer.findMany({
      where,
      include: {
        agreements: {
          where: { isActive: true },
          orderBy: { startDate: "desc" },
          take: 1,
        },
        servicePeriods: {
          orderBy: { startDate: "desc" },
          take: 10,
        },
        payments: {
          orderBy: { paymentDate: "desc" },
          take: 5,
        },
      },
      orderBy: { commercialName: "asc" },
    })

    // Filter by billing status if provided
    let filteredCustomers = customers
    if (billingStatus) {
      filteredCustomers = customers.filter((customer) => {
        return customer.servicePeriods.some(
          (period) => period.billingStatus === billingStatus
        )
      })
    }

    return NextResponse.json(filteredCustomers)
  } catch (error) {
    console.error("Error fetching customers:", error)
    return NextResponse.json(
      { error: "Failed to fetch customers" },
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
    } = body

    const customer = await prisma.customer.create({
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
      },
    })

    return NextResponse.json(customer)
  } catch (error) {
    console.error("Error creating customer:", error)
    return NextResponse.json(
      { error: "Failed to create customer" },
      { status: 500 }
    )
  }
}

