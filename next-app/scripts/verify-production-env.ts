import {
  renderProductionEnvironmentChecks,
  verifyProductionEnvironment,
} from "../src/lib/production-env"

const result = verifyProductionEnvironment(process.env)

console.info("Production environment verification (secret values redacted)")
for (const line of renderProductionEnvironmentChecks(result)) console.info(line)
if (!result.valid) process.exitCode = 1
