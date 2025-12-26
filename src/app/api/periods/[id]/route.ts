import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"
import { updatePeriodStatuses, calculateCustomerStatuses } from "@/lib/status-calculator"

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
    const { billingStatus, status, notes, endDate } = body

    // Get the period to find the customer
    const existingPeriod = await prisma.servicePeriod.findUnique({
      where: { id: resolvedParams.id },
      include: { customer: true },
    })

    if (!existingPeriod) {
      return NextResponse.json(
        { error: "Period not found" },
        { status: 404 }
      )
    }

    // Prepare update data
    const updateData: any = {}
    if (billingStatus !== undefined) updateData.billingStatus = billingStatus
    if (status !== undefined) updateData.status = status
    if (notes !== undefined) updateData.notes = notes
    if (endDate !== undefined) {
      updateData.endDate = new Date(endDate)
      // If renewing (extending end date), update status to ACTIVE if it was EXPIRED
      if (new Date(endDate) > new Date(existingPeriod.endDate)) {
        if (existingPeriod.status === "EXPIRED") {
          updateData.status = "ACTIVE"
        }
      }
    }

    const period = await prisma.servicePeriod.update({
      where: { id: resolvedParams.id },
      data: updateData,
    })

    // Recalculate customer statuses after period update
    await updatePeriodStatuses(existingPeriod.customerId)
    const statuses = await calculateCustomerStatuses(existingPeriod.customerId)
    await prisma.customer.update({
      where: { id: existingPeriod.customerId },
      data: {
        operationalStatus: statuses.operationalStatus,
        relationshipStatus: statuses.relationshipStatus,
      },
    })

    return NextResponse.json(period)
  } catch (error) {
    console.error("Error updating period:", error)
    return NextResponse.json(
      { error: "Failed to update period" },
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

    // Get the period and check for payment links
    const period = await prisma.servicePeriod.findUnique({
      where: { id: resolvedParams.id },
      include: {
        paymentPeriods: true,
        customer: true,
      },
    })

    if (!period) {
      return NextResponse.json(
        { error: "Period not found" },
        { status: 404 }
      )
    }

    // Check if there are any payment links
    if (period.paymentPeriods.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete period with linked payments. Please unlink payments first." },
        { status: 400 }
      )
    }

    // Delete the period
    await prisma.servicePeriod.delete({
      where: { id: resolvedParams.id },
    })

    // Recalculate customer statuses after period deletion
    await updatePeriodStatuses(period.customerId)
    const statuses = await calculateCustomerStatuses(period.customerId)
    await prisma.customer.update({
      where: { id: period.customerId },
      data: {
        operationalStatus: statuses.operationalStatus,
        relationshipStatus: statuses.relationshipStatus,
      },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting period:", error)
    return NextResponse.json(
      { error: "Failed to delete period" },
      { status: 500 }
    )
  }
}

