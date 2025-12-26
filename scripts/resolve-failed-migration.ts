#!/usr/bin/env tsx
/**
 * Script to clear Prisma migration history (for fresh start)
 * WARNING: This deletes all migration records. Only use if you're starting fresh!
 */
import "dotenv/config";
import { Pool } from "pg";

const connectionString = process.env.PRISMA_POSTGRES_POSTGRES_URL || process.env.DATABASE_URL;

if (!connectionString) {
  throw new Error("PRISMA_POSTGRES_POSTGRES_URL or DATABASE_URL must be set");
}

const pool = new Pool({ connectionString });

async function clearMigrationHistory() {
  try {
    console.log("Clearing Prisma migration history...");
    
    // Check if _prisma_migrations table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '_prisma_migrations'
      );
    `);

    if (!tableExists.rows[0].exists) {
      console.log("✅ No migration history table found. Database is already clean.");
      return;
    }

    // Get count of migrations
    const countResult = await pool.query(`SELECT COUNT(*) as count FROM _prisma_migrations;`);
    const count = parseInt(countResult.rows[0].count);
    
    if (count === 0) {
      console.log("✅ Migration history is already empty.");
      return;
    }

    console.log(`Found ${count} migration record(s). Clearing...`);
    
    // Delete all migration records
    await pool.query(`DELETE FROM _prisma_migrations;`);
    
    console.log(`✅ Cleared ${count} migration record(s).`);
    console.log("You can now run migrations from scratch.");
  } catch (error) {
    console.error("❌ Error clearing migration history:", error);
    throw error;
  } finally {
    await pool.end();
  }
}

clearMigrationHistory()
  .then(() => {
    console.log("Done.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
  });

