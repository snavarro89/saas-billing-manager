# Migration Guide - Operational Status Update

## Database Migration Required

The `OperationalStatus` enum has been updated. You need to run a migration to update your database.

### Steps:

1. **Backup your database** (important!)

2. **Run the migration:**
   ```bash
   yarn db:migrate
   ```
   
   When prompted, the migration will:
   - Remove: `ACTIVE_WITH_DEBT`, `CANCELLED`, `LOST_CUSTOMER`
   - Add: `PENDING_RENEWAL`
   - Keep: `ACTIVE`, `SUSPENDED`
   - Note: `ACTIVE_WITH_PENDING_PAYMENT` already exists

3. **If you have existing data with old status values**, you'll need to manually update them:
   ```sql
   -- Update ACTIVE_WITH_DEBT to ACTIVE_WITH_PENDING_PAYMENT
   UPDATE "Customer" SET "operationalStatus" = 'ACTIVE_WITH_PENDING_PAYMENT' 
   WHERE "operationalStatus" = 'ACTIVE_WITH_DEBT';
   
   -- Update LOST_CUSTOMER to LOST
   UPDATE "Customer" SET "operationalStatus" = 'LOST' 
   WHERE "operationalStatus" = 'LOST_CUSTOMER';
   
   -- Update CANCELLED to SUSPENDED (or handle as needed)
   UPDATE "Customer" SET "operationalStatus" = 'SUSPENDED' 
   WHERE "operationalStatus" = 'CANCELLED';
   ```

4. **After migration, regenerate Prisma client:**
   ```bash
   yarn db:generate
   ```

## New Status Behavior

- **ACTIVE**: Active service period exists AND has payment linked
- **ACTIVE_WITH_PENDING_PAYMENT**: Active service period exists BUT no payment linked
- **PENDING_RENEWAL**: No active period, but has past periods
- **SUSPENDED**: Manually set by user
- **LOST**: Manually set by user

Statuses are now automatically calculated based on service periods and payment links.

