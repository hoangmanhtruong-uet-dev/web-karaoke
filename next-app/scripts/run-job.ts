import "dotenv/config"

import { createBookingReminders, expireDueBookings } from "../src/lib/booking-jobs"
import { processOutbox } from "../src/lib/outbox-worker"
import prisma from "../src/lib/prisma"

const job = process.argv[2]

async function run() {
  if (job === "expire-bookings") return expireDueBookings()
  if (job === "process-outbox") return processOutbox()
  if (job === "create-reminders") return createBookingReminders()
  throw new Error("Unknown job. Use expire-bookings, process-outbox, or create-reminders.")
}

run().then((result) => console.info("Job completed", { job, result })).catch((error: unknown) => {
  console.error("Job failed", { job, error: error instanceof Error ? error.message : "Unknown error" })
  process.exitCode = 1
}).finally(async () => prisma.$disconnect())
