import { spawn } from "bun"
import process from "node:process"

import { LOCAL_DATABASE_FILE_VARIABLE } from "~/src/integrations/drizzle-orm/drizzle.config"

import { localDatabaseFile } from "./local-database.ts"

const LOCAL_CONFIG = "src/integrations/drizzle-orm/drizzle.local.config.ts"

const file = await localDatabaseFile()
process.stdout.write(`Opening Drizzle Studio on the local database ${file}\n`)

const studio = spawn(["vp", "exec", "drizzle-kit", "studio", "--config", LOCAL_CONFIG], {
  env: { ...process.env, [LOCAL_DATABASE_FILE_VARIABLE]: file },
  stderr: "inherit",
  stdin: "inherit",
  stdout: "inherit",
})

process.exitCode = await studio.exited
