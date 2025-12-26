import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

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
    const plan = await prisma.plan.findUnique({
      where: { id: resolvedParams.id },
      include: {
        pricing: {
          orderBy: { frequency: "asc" },
        },
        usageLimits: {
          orderBy: { concept: "asc" },
        },
      },
    })

    if (!plan) {
      return NextResponse.json(
        { error: "Plan not found" },
        { status: 404 }
      )
    }

    return NextResponse.json(plan)
  } catch (error) {
    console.error("Error fetching plan:", error)
    return NextResponse.json(
      { error: "Failed to fetch plan" },
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
    const { code, name, description, type, isActive, conditions } = body

    // Build update data object with only provided fields
    const updateData: any = {}
    if (code !== undefined) updateData.code = code
    if (name !== undefined) updateData.name = name
    if (description !== undefined) updateData.description = description
    if (type !== undefined) updateData.type = type
    if (isActive !== undefined) updateData.isActive = isActive
    if (conditions !== undefined) updateData.conditions = conditions

    // Check code uniqueness if code is being updated
    if (code) {
      const existingPlan = await prisma.plan.findUnique({
        where: { code },
      })
      if (existingPlan && existingPlan.id !== resolvedParams.id) {
        return NextResponse.json(
          { error: "Plan code already exists" },
          { status: 400 }
        )
      }
    }

    const plan = await prisma.plan.update({
      where: { id: resolvedParams.id },
      data: updateData,
      include: {
        pricing: {
          orderBy: { frequency: "asc" },
        },
        usageLimits: {
          orderBy: { concept: "asc" },
        },
      },
    })

    return NextResponse.json(plan)
  } catch (error) {
    console.error("Error updating plan:", error)
    return NextResponse.json(
      { error: "Failed to update plan" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const resolvedParams = await params

    // Check if plan is used in any service periods
    const servicePeriodsCount = await prisma.servicePeriod.count({
      where: { planId: resolvedParams.id },
    })

    if (servicePeriodsCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete plan that is used in service periods. Deactivate it instead." },
        { status: 400 }
      )
    }

    await prisma.plan.delete({
      where: { id: resolvedParams.id },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting plan:", error)
    return NextResponse.json(
      { error: "Failed to delete plan" },
      { status: 500 }
    )
  }
}

