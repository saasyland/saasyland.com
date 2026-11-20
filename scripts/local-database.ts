import { createHash, createHmac } from "node:crypto"
import { existsSync } from "node:fs"
import { join } from "node:path"

import { ENVIRONMENT } from "~/src/modules/_core/constants/api"

import { readWranglerEnvironment } from "./wrangler-config.ts"

const DATABASE_BINDING = "DB"
const LOCAL_D1_DIRECTORY = ".wrangler/state/v3/d1/miniflare-D1DatabaseObject"
const D1_OBJECT_CLASS = "miniflare-D1DatabaseObject"
const OBJECT_ID_HALF_BYTES = 16

const durableObjectIdFromName = (uniqueKey: string, name: string): string => {
  const key = createHash("sha256").update(uniqueKey).digest()
  const nameHmac = createHmac("sha256", key).update(name).digest().subarray(0, OBJECT_ID_HALF_BYTES)
  const checksum = createHmac("sha256", key).update(nameHmac).digest().subarray(0, OBJECT_ID_HALF_BYTES)

  return Buffer.concat([nameHmac, checksum]).toString("hex")
}

export const localDatabaseFile = async (): Promise<string> => {
  const { d1_databases: databases } = await readWranglerEnvironment(ENVIRONMENT.DEVELOPMENT)
  const database = databases.find(({ binding }) => binding === DATABASE_BINDING)
  if (database === undefined) {
    throw new Error(`wrangler.jsonc binds no ${DATABASE_BINDING} database for ${ENVIRONMENT.DEVELOPMENT}`)
  }

  const file = join(
    LOCAL_D1_DIRECTORY,
    `${durableObjectIdFromName(D1_OBJECT_CLASS, database.preview_database_id ?? database.database_id)}.sqlite`,
  )
  if (!existsSync(file)) {
    throw new Error(`The local database ${file} does not exist yet. Run bun run db:reset:local first.`)
  }

  return file
}
