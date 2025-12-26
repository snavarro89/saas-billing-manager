import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function POST(
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
    const { frequency, price, currency } = body

    if (!frequency || price === undefined) {
      return NextResponse.json(
        { error: "Missing required fields: frequency, price" },
        { status: 400 }
      )
    }

    // Verify plan exists
    const plan = await prisma.plan.findUnique({
      where: { id: resolvedParams.id },
    })

    if (!plan) {
      return NextResponse.json(
        { error: "Plan not found" },
        { status: 404 }
      )
    }

    // Check if pricing for this frequency already exists
    const existingPricing = await prisma.planPricing.findUnique({
      where: {
        planId_frequency: {
          planId: resolvedParams.id,
          frequency,
        },
      },
    })

    if (existingPricing) {
      return NextResponse.json(
        { error: "Pricing for this frequency already exists" },
        { status: 400 }
      )
    }

    const pricing = await prisma.planPricing.create({
      data: {
        planId: resolvedParams.id,
        frequency,
        price: parseFloat(price),
        currency: currency || "MXN",
      },
    })

    return NextResponse.json(pricing)
  } catch (error) {
    console.error("Error creating plan pricing:", error)
    return NextResponse.json(
      { error: "Failed to create plan pricing" },
      { status: 500 }
    )
  }
}

