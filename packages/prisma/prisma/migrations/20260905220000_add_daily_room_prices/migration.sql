CREATE TYPE "DailyPriceSource" AS ENUM ('BASE', 'MANUAL', 'APPROVED_RULE');
CREATE TABLE "daily_room_prices" (
 "id" UUID NOT NULL, "room_id" UUID NOT NULL, "property_id" UUID NOT NULL,
 "effective_date" DATE NOT NULL, "price" DECIMAL(10,2) NOT NULL,
 "previous_price" DECIMAL(10,2), "source" "DailyPriceSource" NOT NULL DEFAULT 'BASE',
 "approval_id" UUID, "version" INTEGER NOT NULL DEFAULT 1,
 "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
 "updated_at" TIMESTAMP(3) NOT NULL,
 CONSTRAINT "daily_room_prices_pkey" PRIMARY KEY ("id"),
 CONSTRAINT "daily_room_prices_room_id_effective_date_key" UNIQUE ("room_id","effective_date")
);
CREATE INDEX "daily_room_prices_property_id_effective_date_idx" ON "daily_room_prices"("property_id","effective_date");
ALTER TABLE "daily_room_prices" ADD CONSTRAINT "daily_room_prices_room_id_fkey" FOREIGN KEY ("room_id") REFERENCES "rooms"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "daily_room_prices" ADD CONSTRAINT "daily_room_prices_property_id_fkey" FOREIGN KEY ("property_id") REFERENCES "properties"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
