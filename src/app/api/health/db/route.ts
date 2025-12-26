import { NextResponse } from "next/server"
import { prisma } from "@/lib/db"

/**
 * Smoke test endpoint to validate database connectivity
 * Useful for verifying DB connection after deployments
 * GET /api/health/db
 */
export async function GET() {
  console.log("[HEALTH] 🏥 Database health check started")
  
  try {
    // Log environment info (sanitized)
    const envInfo = {
      hasPrismaUrl: !!process.env.PRISMA_POSTGRES_PRISMA_DATABASE_URL,
      hasDatabaseUrl: !!process.env.DATABASE_URL,
      hasPostgresUrl: !!process.env.PRISMA_POSTGRES_POSTGRES_URL,
      nodeEnv: process.env.NODE_ENV,
      connectionString: process.env.PRISMA_POSTGRES_PRISMA_DATABASE_URL 
        ? process.env.PRISMA_POSTGRES_PRISMA_DATABASE_URL.replace(/:([^:@]+)@/, ':****@')
        : process.env.DATABASE_URL?.replace(/:([^:@]+)@/, ':****@') || 'not set'
    }
    console.log("[HEALTH] Environment info:", envInfo)

    // Test basic connection
    console.log("[HEALTH] Testing basic connection...")
    await prisma.$connect()
    console.log("[HEALTH] ✅ Connection successful")

    // Run a trivial query to test database connectivity
    console.log("[HEALTH] Running test query...")
    await prisma.$queryRaw`SELECT 1`
    console.log("[HEALTH] ✅ Query successful")

    // Try to query User table to see if schema is correct
    console.log("[HEALTH] Testing User table access...")
    const userCount = await prisma.user.count()
    console.log("[HEALTH] ✅ User table accessible, count:", userCount)
    
    return NextResponse.json(
      { 
        status: "ok", 
        database: "connected",
        userCount,
        env: envInfo,
        timestamp: new Date().toISOString()
      },
      { status: 200 }
    )
  } catch (error) {
    console.error("[HEALTH] ❌ Database health check failed:", error)
    console.error("[HEALTH] Error details:", {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      code: (error as any)?.code,
      meta: (error as any)?.meta,
      cause: (error as any)?.cause,
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 10).join('\n') : undefined
    })
    
    return NextResponse.json(
      { 
        status: "error", 
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
        errorCode: (error as any)?.code,
        errorMeta: (error as any)?.meta,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

