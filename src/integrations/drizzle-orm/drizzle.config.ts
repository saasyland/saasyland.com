import { defineConfig } from "drizzle-kit"

export const LOCAL_DATABASE_FILE_VARIABLE = "LOCAL_DATABASE_FILE"

export const DRIZZLE_PROJECT = {
  dialect: "sqlite",
  migrations: {
    prefix: "timestamp",
  },
  out: "./src/integrations/drizzle-orm/migrations",
  schema: "./src/integrations/drizzle-orm/drizzle.schemas.ts",
  strict: true,
  verbose: true,
} as const

export default defineConfig({
  ...DRIZZLE_PROJECT,
  dbCredentials: {
    accountId: globalThis.process.env.CLOUDFLARE_ACCOUNT_ID,
    databaseId: globalThis.process.env.CLOUDFLARE_DATABASE_ID,
    token: globalThis.process.env.CLOUDFLARE_ACCESS_TOKEN,
  },
  driver: "d1-http",
})
