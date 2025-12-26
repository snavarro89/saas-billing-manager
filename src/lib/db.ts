import { PrismaClient } from '../generated/prisma/client'
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"

// Use POSTGRES_PRISMA_URL in production (Vercel/Supabase) or DATABASE_URL for local development
const connectionString = process.env.POSTGRES_PRISMA_URL || process.env.POSTGRES_URL || process.env.DATABASE_URL!

if (!connectionString) {
  throw new Error("DATABASE_URL, POSTGRES_URL, or POSTGRES_PRISMA_URL must be set")
}

const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

