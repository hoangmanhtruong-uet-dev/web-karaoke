# Pricing schema proposal

`Room.hourlyRate` remains the safe legacy fallback. `PricingRule` adds branch/room/tier scope, rule type, VN day/date/time predicates, validity dates, rate and explicit priority. The pricing service selects highest priority and deterministically sorts by id. Admin writes must call `assertNoEqualPriorityOverlap`; every mutation writes `AuditLog`. `Booking.priceSnapshot` stores the complete breakdown and `roomAmount` stores the immutable room total. The migration is additive and must be reviewed/applied in development or staging, never directly on production.

Priority convention: holiday 400, special 300, weekend 200, regular 100, default room 0.

Payment provider is intentionally not configured in this repository. The webhook endpoint remains disabled until `PAYMENT_PROVIDER` and `PAYMENT_WEBHOOK_SECRET` are configured; redirects are never trusted as proof of payment.
