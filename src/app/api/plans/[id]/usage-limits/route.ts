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
    const { concept, limitValue, unit } = body

    if (!concept) {
      return NextResponse.json(
        { error: "Missing required field: concept" },
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

    const usageLimit = await prisma.planUsageLimit.create({
      data: {
        planId: resolvedParams.id,
        concept,
        limitValue: limitValue !== null && limitValue !== undefined ? parseFloat(limitValue) : null,
        unit: unit || null,
      },
    })

    return NextResponse.json(usageLimit)
  } catch (error) {
    console.error("Error creating plan usage limit:", error)
    return NextResponse.json(
      { error: "Failed to create plan usage limit" },
      { status: 500 }
    )
  }
}

