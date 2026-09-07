-- Add a hashed, opaque capability token for anonymous guest booking access.
ALTER TABLE "bookings" ADD COLUMN "access_token_hash" TEXT;
CREATE UNIQUE INDEX "bookings_access_token_hash_key" ON "bookings"("access_token_hash");