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
    const isActive = searchParams.get("isActive")
    const type = searchParams.get("type")

    const where: any = {}
    if (isActive !== null) {
      where.isActive = isActive === "true"
    }
    if (type) {
      where.type = type
    }

    const plans = await prisma.plan.findMany({
      where,
      include: {
        pricing: {
          orderBy: { frequency: "asc" },
        },
        usageLimits: {
          orderBy: { concept: "asc" },
        },
      },
      orderBy: { name: "asc" },
    })

    return NextResponse.json(plans)
  } catch (error) {
    console.error("Error fetching plans:", error)
    return NextResponse.json(
      { error: "Failed to fetch plans" },
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
    const { code, name, description, type, isActive, conditions, pricing, usageLimits } = body

    // Validate required fields
    if (!code || !name || !type) {
      return NextResponse.json(
        { error: "Missing required fields: code, name, type" },
        { status: 400 }
      )
    }

    // Check if code already exists
    const existingPlan = await prisma.plan.findUnique({
      where: { code },
    })

    if (existingPlan) {
      return NextResponse.json(
        { error: "Plan code already exists" },
        { status: 400 }
      )
    }

    // Validate pricing array
    if (!pricing || !Array.isArray(pricing) || pricing.length === 0) {
      return NextResponse.json(
        { error: "Plan must have at least one pricing entry" },
        { status: 400 }
      )
    }

    // Validate usage limits for usage-based plans
    if (type === "USAGE_BASED" && (!usageLimits || !Array.isArray(usageLimits) || usageLimits.length === 0)) {
      return NextResponse.json(
        { error: "Usage-based plans must have at least one usage limit" },
        { status: 400 }
      )
    }

    // Create plan with pricing and usage limits
    const plan = await prisma.plan.create({
      data: {
        code,
        name,
        description: description || null,
        type,
        isActive: isActive !== undefined ? isActive : true,
        conditions: conditions || null,
        pricing: {
          create: pricing.map((p: any) => ({
            frequency: p.frequency,
            price: parseFloat(p.price),
            currency: p.currency || "MXN",
          })),
        },
        usageLimits: usageLimits && Array.isArray(usageLimits) ? {
          create: usageLimits.map((ul: any) => ({
            concept: ul.concept,
            limitValue: ul.limitValue !== null && ul.limitValue !== undefined ? parseFloat(ul.limitValue) : null,
            unit: ul.unit || null,
          })),
        } : undefined,
      },
      include: {
        pricing: true,
        usageLimits: true,
      },
    })

    return NextResponse.json(plan)
  } catch (error) {
    console.error("Error creating plan:", error)
    return NextResponse.json(
      { error: "Failed to create plan" },
      { status: 500 }
    )
  }
}

