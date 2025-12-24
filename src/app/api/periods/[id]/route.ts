import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"
import { auth } from "@/lib/auth"

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
    const { billingStatus, status, notes } = body

    const period = await prisma.servicePeriod.update({
      where: { id: params.id },
      data: {
        billingStatus,
        status,
        notes,
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

