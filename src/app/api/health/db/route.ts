import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

/**
 * Smoke test endpoint to validate database connectivity
 * Useful for verifying DB connection after deployments
 * GET /api/health/db
 */
export async function GET() {
  try {
    // Run a trivial query to test database connectivity
    await prisma.$queryRaw`SELECT 1`
    
    return NextResponse.json(
      { 
        status: "ok", 
        database: "connected",
        timestamp: new Date().toISOString()
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("Database health check failed:", error)
    
    return NextResponse.json(
      { 
        status: "error", 
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

