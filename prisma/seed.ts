import "dotenv/config"
import { PrismaClient } from "../src/generated/prisma/client"
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"

const connectionString = process.env.DATABASE_URL!
const pool = new Pool({ connectionString })
const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function main() {
  // Create a default admin user
  const hashedPassword = await bcrypt.hash("admin123", 10)
  
  const user = await prisma.user.upsert({
    where: { username: "admin" },
    update: {},
    create: {
      username: "admin",
      password: hashedPassword,
      role: "admin",
    },
  })

  console.log("Created user:", user.username)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })

