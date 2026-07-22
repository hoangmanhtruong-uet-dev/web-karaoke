-- Additive contact idempotency support. Existing rows remain valid and unchanged.
ALTER TABLE "ContactRequest"
  ADD COLUMN IF NOT EXISTS "idempotencyKey" VARCHAR(100),
  ADD COLUMN IF NOT EXISTS "requestHash" VARCHAR(64);

CREATE UNIQUE INDEX IF NOT EXISTS "ContactRequest_idempotencyKey_key"
  ON "ContactRequest"("idempotencyKey");
