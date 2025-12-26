import { PrismaClient } from '../generated/prisma/client'
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"

// Use PRISMA_POSTGRES_PRISMA_DATABASE_URL in production (Vercel/Prisma Postgres) or DATABASE_URL for local development
const connectionString = process.env.PRISMA_POSTGRES_PRISMA_DATABASE_URL || process.env.DATABASE_URL!

if (!connectionString) {
  throw new Error("PRISMA_POSTGRES_PRISMA_DATABASE_URL or DATABASE_URL must be set")
}

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Always cache PrismaClient instance to prevent connection exhaustion in serverless environments
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (!globalForPrisma.prisma) {
  globalForPrisma.prisma = prisma
}

