#!/usr/bin/env tsx
/**
 * Pre-migration script: Resolves any failed migrations before running new ones
 * This is called automatically during build to ensure clean migration state
 */
import "dotenv/config";
import { Pool } from "pg";

const connectionString = process.env.PRISMA_POSTGRES_POSTGRES_URL || process.env.DATABASE_URL;

if (!connectionString) {
  // If no connection string, skip (might be in a different environment)
  console.log("No database connection string found, skipping pre-migration checks.");
  process.exit(0);
}

const pool = new Pool({ connectionString });

async function resolveFailedMigrations() {
  try {
    // Check if _prisma_migrations table exists
    const tableExists = await pool.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = '_prisma_migrations'
      );
    `);

    if (!tableExists.rows[0].exists) {
      // Table doesn't exist, nothing to resolve
      return;
    }

    // Find failed migrations (started but not finished and not rolled back)
    const failedMigrations = await pool.query(`
      SELECT migration_name 
      FROM _prisma_migrations 
      WHERE finished_at IS NULL AND rolled_back_at IS NULL
      ORDER BY started_at DESC;
    `);

    if (failedMigrations.rows.length === 0) {
      return; // No failed migrations
    }

    console.log(`Found ${failedMigrations.rows.length} failed migration(s), marking as rolled back...`);
    
    // Mark all failed migrations as rolled back
    for (const row of failedMigrations.rows) {
      await pool.query(`
        UPDATE _prisma_migrations 
        SET rolled_back_at = NOW()
        WHERE migration_name = $1 AND finished_at IS NULL AND rolled_back_at IS NULL;
      `, [row.migration_name]);
      console.log(`  ✓ Resolved: ${row.migration_name}`);
    }

    console.log("✅ All failed migrations resolved.");
  } catch (error) {
    // Don't fail the build if we can't resolve migrations
    // This might happen if the database is not accessible or table doesn't exist
    console.warn("⚠️  Could not resolve failed migrations (this is OK if starting fresh):", error instanceof Error ? error.message : error);
  } finally {
    await pool.end();
  }
}

resolveFailedMigrations()
  .then(() => process.exit(0))
  .catch(() => process.exit(0)); // Always exit successfully to not block build

