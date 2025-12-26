import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; pricingId: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const resolvedParams = await params
    const body = await request.json()
    const { frequency, price, currency } = body

    // Build update data
    const updateData: any = {}
    if (frequency !== undefined) updateData.frequency = frequency
    if (price !== undefined) updateData.price = parseFloat(price)
    if (currency !== undefined) updateData.currency = currency

    // Check if pricing exists and belongs to plan
    const existingPricing = await prisma.planPricing.findUnique({
      where: { id: resolvedParams.pricingId },
    })

    if (!existingPricing || existingPricing.planId !== resolvedParams.id) {
      return NextResponse.json(
        { error: "Pricing not found" },
        { status: 404 }
      )
    }

    // If frequency is being updated, check for conflicts
    if (frequency && frequency !== existingPricing.frequency) {
      const conflict = await prisma.planPricing.findUnique({
        where: {
          planId_frequency: {
            planId: resolvedParams.id,
            frequency,
          },
        },
      })

      if (conflict) {
        return NextResponse.json(
          { error: "Pricing for this frequency already exists" },
          { status: 400 }
        )
      }
    }

    const pricing = await prisma.planPricing.update({
      where: { id: resolvedParams.pricingId },
      data: updateData,
    })

    return NextResponse.json(pricing)
  } catch (error) {
    console.error("Error updating plan pricing:", error)
    return NextResponse.json(
      { error: "Failed to update plan pricing" },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string; pricingId: string }> }
) {
  try {
    const session = await auth()
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const resolvedParams = await params

    // Check if pricing exists and belongs to plan
    const pricing = await prisma.planPricing.findUnique({
      where: { id: resolvedParams.pricingId },
    })

    if (!pricing || pricing.planId !== resolvedParams.id) {
      return NextResponse.json(
        { error: "Pricing not found" },
        { status: 404 }
      )
    }

    // Check if this is the last pricing entry
    const pricingCount = await prisma.planPricing.count({
      where: { planId: resolvedParams.id },
    })

    if (pricingCount <= 1) {
      return NextResponse.json(
        { error: "Cannot delete the last pricing entry. Plan must have at least one pricing." },
        { status: 400 }
      )
    }

    await prisma.planPricing.delete({
      where: { id: resolvedParams.pricingId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting plan pricing:", error)
    return NextResponse.json(
      { error: "Failed to delete plan pricing" },
      { status: 500 }
    )
  }
}

