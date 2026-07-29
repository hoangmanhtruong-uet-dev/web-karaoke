import "dotenv/config"

import { createBookingReminders, expireDueBookings } from "../src/lib/booking-jobs"
import { logger } from "../src/lib/logger"
import { processOutbox } from "../src/lib/outbox-worker"
import prisma from "../src/lib/prisma"

const job = process.argv[2]

async function run() {
  if (job === "expire-bookings") return expireDueBookings()
  if (job === "process-outbox") return processOutbox()
  if (job === "create-reminders") return createBookingReminders()
  throw new Error("Unknown job. Use expire-bookings, process-outbox, or create-reminders.")
}

run().then((result) => logger.info("job_completed", { job, result })).catch((error: unknown) => {
  logger.error("job_failed", { job, errorCode: error instanceof Error ? error.constructor.name : "UNKNOWN" })
  process.exitCode = 1
}).finally(async () => prisma.$disconnect())
