import { PrismaClient } from '../src/generated/prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'
import 'dotenv/config'

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
})

const adapter = new PrismaPg(pool)
const prisma = new PrismaClient({ adapter })

async function clearData() {
  console.log('Starting data cleanup...')

  try {
    // Delete in order to respect foreign key constraints
    // 1. Delete PaymentPeriods (junction table)
    const deletedPaymentPeriods = await prisma.paymentPeriod.deleteMany({})
    console.log(`Deleted ${deletedPaymentPeriods.count} payment periods`)

    // 2. Delete Payments
    const deletedPayments = await prisma.payment.deleteMany({})
    console.log(`Deleted ${deletedPayments.count} payments`)

    // 3. Delete Invoices
    const deletedInvoices = await prisma.invoice.deleteMany({})
    console.log(`Deleted ${deletedInvoices.count} invoices`)

    // 4. Delete ServicePeriods
    const deletedServicePeriods = await prisma.servicePeriod.deleteMany({})
    console.log(`Deleted ${deletedServicePeriods.count} service periods`)

    console.log('✅ Data cleanup completed successfully!')
    console.log('Customers and agreements have been preserved.')
  } catch (error) {
    console.error('❌ Error during data cleanup:', error)
    throw error
  } finally {
    await prisma.$disconnect()
    await pool.end()
  }
}

clearData()

