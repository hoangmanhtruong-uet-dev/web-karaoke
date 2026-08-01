ALTER TABLE "PricingRule"
  ADD CONSTRAINT "PricingRule_branchId_fkey"
  FOREIGN KEY ("branchId") REFERENCES "Branch"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PricingRule"
  ADD CONSTRAINT "PricingRule_roomId_fkey"
  FOREIGN KEY ("roomId") REFERENCES "Room"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
