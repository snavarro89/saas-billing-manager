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
    
    // Verify Prisma Client is available
    console.log("[HEALTH] Checking Prisma Client...")
    if (!prisma) {
      throw new Error("Prisma Client is not initialized")
    }
    console.log("[HEALTH] ✅ Prisma Client is available")
    
    // Check if adapter is being used
    const hasAdapter = (prisma as any).$adapter !== undefined
    console.log("[HEALTH] Prisma Client adapter:", hasAdapter ? "present" : "missing")

    // Test basic connection
    console.log("[HEALTH] Testing basic connection...")
    try {
      await prisma.$connect()
      console.log("[HEALTH] ✅ Connection successful")
    } catch (connectError) {
      console.error("[HEALTH] ❌ Connection failed:", connectError)
      throw connectError
    }

    // Try to query User table to see if schema is correct (simpler than $queryRaw)
    console.log("[HEALTH] Testing User table access...")
    let userCount = 0
    try {
      userCount = await prisma.user.count()
      console.log("[HEALTH] ✅ User table accessible, count:", userCount)
    } catch (queryError) {
      console.error("[HEALTH] ❌ User table query failed:", queryError)
      console.error("[HEALTH] Query error details:", {
        name: queryError instanceof Error ? queryError.name : 'Unknown',
        message: queryError instanceof Error ? queryError.message : String(queryError),
        code: (queryError as any)?.code,
        meta: (queryError as any)?.meta,
        clientVersion: (queryError as any)?.clientVersion
      })
      throw queryError
    }
    
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
    
    // Get full error details
    const errorDetails = {
      name: error instanceof Error ? error.name : 'Unknown',
      message: error instanceof Error ? error.message : String(error),
      code: (error as any)?.code,
      meta: (error as any)?.meta,
      cause: (error as any)?.cause,
      clientVersion: (error as any)?.clientVersion,
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 15).join('\n') : undefined
    }
    
    console.error("[HEALTH] Full error details:", JSON.stringify(errorDetails, null, 2))
    
    // Check if it's a Prisma error
    const isPrismaError = error instanceof Error && (
      error.name.includes('Prisma') || 
      error.message.includes('prisma') ||
      (error as any).code?.startsWith('P')
    )
    
    return NextResponse.json(
      { 
        status: "error", 
        database: "disconnected",
        error: error instanceof Error ? error.message : "Unknown error",
        errorName: errorDetails.name,
        errorCode: errorDetails.code,
        errorMeta: errorDetails.meta,
        isPrismaError,
        clientVersion: errorDetails.clientVersion,
        fullError: process.env.NODE_ENV === 'development' ? errorDetails : undefined,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

