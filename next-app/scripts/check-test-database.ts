import { assertSafeTestDatabase } from "./test-database-guard"
import {
  enterTestEnvironment,
  loadLocalTestEnvironment,
} from "./test-database-environment"

loadLocalTestEnvironment()
enterTestEnvironment()
assertSafeTestDatabase()
