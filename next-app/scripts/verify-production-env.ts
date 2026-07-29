import { logger } from "../src/lib/logger"
import {
  renderProductionEnvironmentChecks,
  verifyProductionEnvironment,
} from "../src/lib/production-env"

const result = verifyProductionEnvironment(process.env)

logger.info("production_environment_verification_started")
for (const line of renderProductionEnvironmentChecks(result)) logger.info("production_environment_check", { check: line })
if (!result.valid) process.exitCode = 1
