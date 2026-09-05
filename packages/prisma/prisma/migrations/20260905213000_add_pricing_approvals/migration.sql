CREATE TYPE "PricingApprovalAction" AS ENUM ('INCREASE', 'DECREASE', 'HOLD');
CREATE TYPE "PricingApprovalStatus" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

CREATE TABLE "pricing_approvals" (
  "id" UUID NOT NULL,
  "property_id" UUID NOT NULL,
  "rule_id" UUID,
  "host_id" UUID NOT NULL,
  "effective_date" DATE NOT NULL,
  "room_id" UUID,
  "previous_price" DECIMAL(10,2) NOT NULL,
  "proposed_price" DECIMAL(10,2) NOT NULL,
  "action" "PricingApprovalAction" NOT NULL,
  "reason" TEXT,
  "status" "PricingApprovalStatus" NOT NULL DEFAULT 'PENDING',
  "decided_at" TIMESTAMP(3),
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "pricing_approvals_pkey" PRIMARY KEY ("id")
);
CREATE INDEX "pricing_approvals_property_id_effective_date_status_idx" ON "pricing_approvals"("property_id","effective_date","status");
CREATE INDEX "pricing_approvals_host_id_created_at_idx" ON "pricing_approvals"("host_id","created_at");
ALTER TABLE "pricing_approvals" ADD CONSTRAINT "pricing_approvals_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
