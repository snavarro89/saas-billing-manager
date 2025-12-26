-- Delete all service periods, payments, and invoices
-- This will preserve customers and agreements

-- Delete PaymentPeriods (junction table)
DELETE FROM "PaymentPeriod";

-- Delete Payments
DELETE FROM "Payment";

-- Delete Invoices
DELETE FROM "Invoice";

-- Delete ServicePeriods
DELETE FROM "ServicePeriod";

-- Verify customers still exist
SELECT COUNT(*) as customer_count FROM "Customer";
