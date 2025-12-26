import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; limitId: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const resolvedParams = await params
    const body = await request.json()
    const { concept, limitValue, unit } = body

    // Build update data
    const updateData: any = {}
    if (concept !== undefined) updateData.concept = concept
    if (limitValue !== undefined) {
      updateData.limitValue = limitValue !== null && limitValue !== undefined ? parseFloat(limitValue) : null
    }
    if (unit !== undefined) updateData.unit = unit || null

    // Check if usage limit exists and belongs to plan
    const existingLimit = await prisma.planUsageLimit.findUnique({
      where: { id: resolvedParams.limitId },
    })

    if (!existingLimit || existingLimit.planId !== resolvedParams.id) {
      return NextResponse.json(
        { error: "Usage limit not found" },
        { status: 404 }
      )
    }

    const usageLimit = await prisma.planUsageLimit.update({
      where: { id: resolvedParams.limitId },
      data: updateData,
    })

    return NextResponse.json(usageLimit)
  } catch (error) {
    console.error("Error updating plan usage limit:", error)
    return NextResponse.json(
      { error: "Failed to update plan usage limit" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; limitId: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const resolvedParams = await params

    // Check if usage limit exists and belongs to plan
    const usageLimit = await prisma.planUsageLimit.findUnique({
      where: { id: resolvedParams.limitId },
    })

    if (!usageLimit || usageLimit.planId !== resolvedParams.id) {
      return NextResponse.json(
        { error: "Usage limit not found" },
        { status: 404 }
      )
    }

    await prisma.planUsageLimit.delete({
      where: { id: resolvedParams.limitId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting plan usage limit:", error)
    return NextResponse.json(
      { error: "Failed to delete plan usage limit" },
      { status: 500 }
    )
  }
}

