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
    const {
      customerId,
      subtotalAmount,
      currency,
      description,
      billingCycle,
      renewalDay,
      gracePeriodDays,
      customerType,
      specialRules,
    } = body

    // Deactivate old agreements
    await prisma.commercialAgreement.updateMany({
      where: {
        customerId,
        isActive: true,
      },
      data: {
        isActive: false,
        endDate: new Date(),
      },
    })

    const agreement = await prisma.commercialAgreement.create({
      data: {
        customerId,
        subtotalAmount: parseFloat(subtotalAmount),
        currency: currency || "MXN",
        description,
        billingCycle,
        renewalDay: parseInt(renewalDay),
        gracePeriodDays: parseInt(gracePeriodDays) || 0,
        customerType,
        specialRules,
        isActive: true,
      },
    })

    return NextResponse.json(agreement)
  } catch (error) {
    console.error("Error creating agreement:", error)
    return NextResponse.json(
      { error: "Failed to create agreement" },
      { status: 500 }
    )
  }
}

