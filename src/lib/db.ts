import { PrismaClient } from '../generated/prisma/client'
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"

// Use PRISMA_POSTGRES_PRISMA_DATABASE_URL in production (Vercel/Prisma Postgres) or DATABASE_URL for local development
const connectionString = process.env.PRISMA_POSTGRES_PRISMA_DATABASE_URL || process.env.DATABASE_URL!

if (!connectionString) {
  const error = "PRISMA_POSTGRES_PRISMA_DATABASE_URL or DATABASE_URL must be set"
  console.error("[DB] ❌", error)
  console.error("[DB] Available env vars:", {
    hasPrismaUrl: !!process.env.PRISMA_POSTGRES_PRISMA_DATABASE_URL,
    hasDatabaseUrl: !!process.env.DATABASE_URL,
    hasPostgresUrl: !!process.env.PRISMA_POSTGRES_POSTGRES_URL,
    nodeEnv: process.env.NODE_ENV
  })
  throw new Error(error)
}

// Sanitize connection string for logging (remove password)
const sanitizedUrl = connectionString.replace(/:([^:@]+)@/, ':****@')
console.log("[DB] 🔌 Initializing database connection...")
console.log("[DB] Connection string:", sanitizedUrl)
console.log("[DB] Using env var:", process.env.PRISMA_POSTGRES_PRISMA_DATABASE_URL ? "PRISMA_POSTGRES_PRISMA_DATABASE_URL" : "DATABASE_URL")

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)

console.log("[DB] ✅ Pool created, adapter initialized")

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Always cache PrismaClient instance to prevent connection exhaustion in serverless environments
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ 
  adapter,
  log: process.env.NODE_ENV === 'production' ? ['error', 'warn'] : ['query', 'error', 'warn', 'info']
})

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma
  console.log("[DB] ✅ PrismaClient created and cached")
  
  // Test connection on first creation
  prisma.$connect()
    .then(() => {
      console.log("[DB] ✅ Initial database connection test successful")
    })
    .catch((error) => {
      console.error("[DB] ❌ Initial database connection test failed:", error)
      console.error("[DB] Connection error details:", {
        name: error instanceof Error ? error.name : 'Unknown',
        message: error instanceof Error ? error.message : String(error),
        code: (error as any)?.code,
        meta: (error as any)?.meta
      })
    })
} else {
  console.log("[DB] ♻️  Using cached PrismaClient instance")
}

