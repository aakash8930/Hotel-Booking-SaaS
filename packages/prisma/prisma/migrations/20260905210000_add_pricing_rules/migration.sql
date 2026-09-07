CREATE TYPE "PricingAdjustmentType" AS ENUM ('PERCENT', 'FIXED');

CREATE TABLE "pricing_rules" (
  "id" UUID NOT NULL,
  "property_id" UUID NOT NULL,
  "name" TEXT NOT NULL,
  "adjustment" DECIMAL(7,2) NOT NULL,
  "adjustment_type" "PricingAdjustmentType" NOT NULL,
  "min_demand" INTEGER,
  "max_demand" INTEGER,
  "start_date" DATE,
  "end_date" DATE,
  "is_active" BOOLEAN NOT NULL DEFAULT true,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "pricing_rules_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "pricing_rules_property_id_is_active_idx" ON "pricing_rules"("property_id", "is_active");

ALTER TABLE "pricing_rules"
ADD CONSTRAINT "pricing_rules_property_id_fkey"
FOREIGN KEY ("property_id") REFERENCES "properties"("id")
ON DELETE RESTRICT ON UPDATE CASCADE;
