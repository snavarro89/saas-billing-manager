-- CreateEnum
CREATE TYPE "BillingCycle" AS ENUM ('MONTHLY', 'QUARTERLY', 'SEMI_ANNUAL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "CustomerType" AS ENUM ('NORMAL', 'STRATEGIC', 'TRIAL');

-- CreateEnum
CREATE TYPE "PeriodOrigin" AS ENUM ('PAYMENT', 'TRIAL', 'MANUAL_EXTENSION');

-- CreateEnum
CREATE TYPE "PeriodStatus" AS ENUM ('ACTIVE', 'EXPIRING', 'EXPIRED');

-- CreateEnum
CREATE TYPE "BillingStatus" AS ENUM ('PENDING', 'INVOICED', 'NOT_APPLICABLE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('CONFIRMED', 'REVERTED');

-- CreateEnum
CREATE TYPE "OperationalStatus" AS ENUM ('ACTIVE', 'ACTIVE_WITH_DEBT', 'SUSPENDED', 'CANCELLED', 'LOST_CUSTOMER');

-- CreateEnum
CREATE TYPE "RelationshipStatus" AS ENUM ('ACTIVE', 'UNDER_FOLLOW_UP', 'SUSPENDED_NON_PAYMENT', 'SUSPENDED_NEGOTIATION', 'CANCELLED_VOLUNTARILY', 'LOST_NO_RESPONSE', 'ELIGIBLE_FOR_DELETION');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "role" TEXT DEFAULT 'user',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Customer" (
    "id" TEXT NOT NULL,
    "commercialName" TEXT NOT NULL,
    "alias" TEXT,
    "adminContact" TEXT,
    "billingContact" TEXT,
    "notes" TEXT,
    "legalName" TEXT,
    "rfc" TEXT,
    "fiscalRegime" TEXT,
    "cfdiUsage" TEXT,
    "billingEmail" TEXT,
    "operationalStatus" "OperationalStatus" DEFAULT 'ACTIVE',
    "relationshipStatus" "RelationshipStatus" DEFAULT 'ACTIVE',
    "isDeleted" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Customer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CommercialAgreement" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "subtotalAmount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "description" TEXT,
    "billingCycle" "BillingCycle" NOT NULL,
    "renewalDay" INTEGER NOT NULL,
    "gracePeriodDays" INTEGER NOT NULL DEFAULT 0,
    "customerType" "CustomerType" NOT NULL DEFAULT 'NORMAL',
    "specialRules" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CommercialAgreement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ServicePeriod" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "origin" "PeriodOrigin" NOT NULL,
    "status" "PeriodStatus" NOT NULL DEFAULT 'ACTIVE',
    "subtotalAmount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "billingStatus" "BillingStatus" NOT NULL DEFAULT 'PENDING',
    "suggestedInvoiceDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ServicePeriod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "amount" DOUBLE PRECISION NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MXN',
    "method" TEXT NOT NULL,
    "reference" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'CONFIRMED',
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentPeriod" (
    "id" TEXT NOT NULL,
    "paymentId" TEXT NOT NULL,
    "servicePeriodId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PaymentPeriod_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "Customer_operationalStatus_idx" ON "Customer"("operationalStatus");

-- CreateIndex
CREATE INDEX "Customer_relationshipStatus_idx" ON "Customer"("relationshipStatus");

-- CreateIndex
CREATE INDEX "Customer_isDeleted_idx" ON "Customer"("isDeleted");

-- CreateIndex
CREATE INDEX "CommercialAgreement_customerId_idx" ON "CommercialAgreement"("customerId");

-- CreateIndex
CREATE INDEX "CommercialAgreement_isActive_idx" ON "CommercialAgreement"("isActive");

-- CreateIndex
CREATE INDEX "ServicePeriod_customerId_idx" ON "ServicePeriod"("customerId");

-- CreateIndex
CREATE INDEX "ServicePeriod_status_idx" ON "ServicePeriod"("status");

-- CreateIndex
CREATE INDEX "ServicePeriod_endDate_idx" ON "ServicePeriod"("endDate");

-- CreateIndex
CREATE INDEX "ServicePeriod_billingStatus_idx" ON "ServicePeriod"("billingStatus");

-- CreateIndex
CREATE INDEX "Payment_customerId_idx" ON "Payment"("customerId");

-- CreateIndex
CREATE INDEX "Payment_paymentDate_idx" ON "Payment"("paymentDate");

-- CreateIndex
CREATE INDEX "Payment_status_idx" ON "Payment"("status");

-- CreateIndex
CREATE INDEX "PaymentPeriod_paymentId_idx" ON "PaymentPeriod"("paymentId");

-- CreateIndex
CREATE INDEX "PaymentPeriod_servicePeriodId_idx" ON "PaymentPeriod"("servicePeriodId");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentPeriod_paymentId_servicePeriodId_key" ON "PaymentPeriod"("paymentId", "servicePeriodId");

-- AddForeignKey
ALTER TABLE "CommercialAgreement" ADD CONSTRAINT "CommercialAgreement_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ServicePeriod" ADD CONSTRAINT "ServicePeriod_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentPeriod" ADD CONSTRAINT "PaymentPeriod_paymentId_fkey" FOREIGN KEY ("paymentId") REFERENCES "Payment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentPeriod" ADD CONSTRAINT "PaymentPeriod_servicePeriodId_fkey" FOREIGN KEY ("servicePeriodId") REFERENCES "ServicePeriod"("id") ON DELETE CASCADE ON UPDATE CASCADE;
