import { defineConfig } from "drizzle-kit"
import * as zod from "zod"

import { DRIZZLE_PROJECT, LOCAL_DATABASE_FILE_VARIABLE } from "./drizzle.config.ts"

export default defineConfig({
  ...DRIZZLE_PROJECT,
  dbCredentials: {
    url: zod
      .string({ message: `Run bun run db:studio:local, which sets ${LOCAL_DATABASE_FILE_VARIABLE} to the local D1 file` })
      .min(1)
      .parse(globalThis.process.env[LOCAL_DATABASE_FILE_VARIABLE]),
  },
})
