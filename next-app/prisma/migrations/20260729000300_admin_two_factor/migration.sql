ALTER TABLE "AdminUser"
  ADD COLUMN "twoFactorEnabled" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "twoFactorSecret" TEXT,
  ADD COLUMN "twoFactorPendingSecret" TEXT,
  ADD COLUMN "twoFactorConfirmedAt" TIMESTAMPTZ(3),
  ADD COLUMN "twoFactorLastUsedStep" INTEGER;

CREATE TABLE "TwoFactorRecoveryCode" (
  "id" TEXT NOT NULL,
  "adminUserId" TEXT NOT NULL,
  "codeHash" VARCHAR(64) NOT NULL,
  "usedAt" TIMESTAMPTZ(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "TwoFactorRecoveryCode_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "TwoFactorRecoveryCode_codeHash_key"
  ON "TwoFactorRecoveryCode"("codeHash");
CREATE INDEX "TwoFactorRecoveryCode_adminUserId_usedAt_idx"
  ON "TwoFactorRecoveryCode"("adminUserId", "usedAt");

ALTER TABLE "TwoFactorRecoveryCode"
  ADD CONSTRAINT "TwoFactorRecoveryCode_adminUserId_fkey"
  FOREIGN KEY ("adminUserId") REFERENCES "AdminUser"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
