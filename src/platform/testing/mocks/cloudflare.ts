import { parse } from "jsonc-parser"
import { readFileSync, readdirSync } from "node:fs"
import { resolve } from "node:path"
import { DatabaseSync, type SQLInputValue } from "node:sqlite"
import * as zod from "zod"

const database = new DatabaseSync(":memory:")
const migrations = resolve("src/integrations/drizzle-orm/migrations")
for (const file of readdirSync(migrations)
  .filter((name) => name.endsWith(".sql"))
  .toSorted()) {
  database.exec(readFileSync(resolve(migrations, file), "utf8"))
}

const prepare = (query: string, values: SQLInputValue[] = []) => ({
  all() {
    return Promise.resolve(this.execute())
  },
  bind: (...parameters: SQLInputValue[]) => prepare(query, parameters),
  execute() {
    return { meta: {}, results: database.prepare(query).all(...values), success: true }
  },
  async first(column?: string) {
    const row = database.prepare(query).get(...values)
    return (column === undefined ? row : row?.[column]) ?? null
  },
  async raw() {
    const statement = database.prepare(query)
    statement.setReturnArrays(true)
    return statement.all(...values)
  },
  async run() {
    const result = database.prepare(query).run(...values)
    return { meta: { changes: result.changes, last_row_id: result.lastInsertRowid }, results: [], success: true }
  },
})

const cache = new Map<string, string>()
const pendingTasks = new Set<Promise<unknown>>()

interface StoredObject {
  readonly body: Uint8Array<ArrayBuffer>
  readonly customMetadata: Record<string, string>
  readonly etag: string
}

interface UploadedPart {
  readonly body: Uint8Array<ArrayBuffer>
  readonly etag: string
}

interface PendingUpload {
  readonly key: string
  readonly parts: Map<number, UploadedPart>
}

interface ObjectRange {
  readonly length: number
  readonly offset: number
}

const BUCKET_LIST_LIMIT = 1000

const bucketListSchema = zod.array(zod.object({ binding: zod.string() })).default([])
const testBucketsSchema = zod.object({ env: zod.object({ test: zod.object({ r2_buckets: bucketListSchema }) }) })

const wranglerConfig: unknown = parse(readFileSync(resolve("wrangler.jsonc"), "utf8"))
const testBuckets = testBucketsSchema.parse(wranglerConfig).env.test.r2_buckets

const buckets = new Map(testBuckets.map(({ binding }) => [binding, new Map<string, StoredObject>()]))
const multipartUploads = new Map<string, PendingUpload>()

const bodyBytes = async (value: Blob | string | Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> => {
  if (typeof value === "string") {
    return new TextEncoder().encode(value)
  }
  if (value instanceof Blob) {
    return new Uint8Array(await value.arrayBuffer())
  }
  return value
}

const pendingUpload = (key: string, uploadId: string): PendingUpload => {
  const upload = multipartUploads.get(uploadId)
  if (upload?.key !== key) {
    throw new Error("NoSuchUpload: the multipart upload does not exist")
  }
  return upload
}

const joinParts = (parts: readonly UploadedPart[]): Uint8Array<ArrayBuffer> => {
  const body = new Uint8Array(parts.reduce((total, part) => total + part.body.byteLength, 0))
  parts.reduce((offset, part) => {
    body.set(part.body, offset)
    return offset + part.body.byteLength
  }, 0)
  return body
}

const multipartUpload = (objects: Map<string, StoredObject>, key: string, uploadId: string) => ({
  abort: async () => {
    pendingUpload(key, uploadId)
    multipartUploads.delete(uploadId)
  },
  complete: async (parts: readonly { etag: string; partNumber: number }[]) => {
    const upload = pendingUpload(key, uploadId)
    const stored = parts.map(({ etag, partNumber }) => {
      const part = upload.parts.get(partNumber)
      if (part?.etag !== etag) {
        throw new Error(`InvalidPart: part ${String(partNumber)} was not uploaded with that etag`)
      }
      return part
    })
    const body = joinParts(stored)
    objects.set(key, { body, customMetadata: {}, etag: `${key}:${String(body.byteLength)}` })
    multipartUploads.delete(uploadId)
    return { key, size: body.byteLength }
  },
  key,
  uploadId,
  uploadPart: async (partNumber: number, value: Blob | string | Uint8Array<ArrayBuffer>) => {
    const upload = pendingUpload(key, uploadId)
    const body = await bodyBytes(value)
    const etag = `${uploadId}:${String(partNumber)}:${String(body.byteLength)}`
    upload.parts.set(partNumber, { body, etag })
    return { etag, partNumber }
  },
})

const objectMetadata = (key: string, stored: StoredObject) => ({
  customMetadata: { ...stored.customMetadata },
  httpEtag: `"${stored.etag}"`,
  key,
  size: stored.body.byteLength,
})

const createBucket = (objects: Map<string, StoredObject>) => ({
  createMultipartUpload: async (key: string) => {
    const uploadId = crypto.randomUUID()
    multipartUploads.set(uploadId, { key, parts: new Map() })
    return multipartUpload(objects, key, uploadId)
  },
  delete: async (keys: string | string[]) => {
    for (const key of [keys].flat()) {
      objects.delete(key)
    }
  },
  get: async (key: string, options?: { range?: ObjectRange }) => {
    const stored = objects.get(key)
    if (stored === undefined) {
      return null
    }
    const range = options?.range
    const body = range === undefined ? stored.body : stored.body.slice(range.offset, range.offset + range.length)
    return { ...objectMetadata(key, stored), body: new Blob([body]).stream() }
  },
  head: async (key: string) => {
    const stored = objects.get(key)
    if (stored === undefined) {
      return null
    }
    return objectMetadata(key, stored)
  },
  list: async ({ cursor, limit = BUCKET_LIST_LIMIT, prefix = "" }: { cursor?: string; limit?: number; prefix?: string } = {}) => {
    const keys = [...objects.keys()].filter((key) => key.startsWith(prefix) && (cursor === undefined || key > cursor)).toSorted()
    const page = keys.slice(0, limit)
    const truncated = keys.length > limit
    return { objects: page.map((key) => ({ key })), truncated, ...(truncated ? { cursor: page.at(-1) } : {}) }
  },
  put: async (key: string, value: Blob | string | Uint8Array<ArrayBuffer>, options?: { customMetadata?: Record<string, string> }) => {
    const body = await bodyBytes(value)
    objects.set(key, { body, customMetadata: { ...options?.customMetadata }, etag: `${key}:${String(body.byteLength)}` })
  },
  resumeMultipartUpload: (key: string, uploadId: string) => multipartUpload(objects, key, uploadId),
})

export const resetTestBindings = (): void => {
  cache.clear()
  for (const objects of buckets.values()) {
    objects.clear()
  }
  multipartUploads.clear()
  pendingTasks.clear()
  database.exec("DELETE FROM rate_limit")
}
export const env = {
  ...process.env,
  ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) },
  CACHE: {
    delete: async (key: string) => {
      cache.delete(key)
    },
    get: async (key: string, type?: string) => {
      const value = cache.get(key)
      if (value === undefined) {
        return null
      }
      const decoded: unknown = type === "json" ? JSON.parse(value) : value
      return decoded
    },
    put: async (key: string, value: string) => {
      cache.set(key, value)
    },
  },
  DB: {
    batch: (statements: ReturnType<typeof prepare>[]) => {
      database.exec("BEGIN")
      try {
        const results = statements.map((statement) => statement.execute())
        database.exec("COMMIT")
        return Promise.resolve(results)
      } catch (error) {
        database.exec("ROLLBACK")
        return Promise.reject(error instanceof Error ? error : new Error("SQLite batch failed", { cause: error }))
      }
    },
    prepare,
  },
  ...Object.fromEntries([...buckets].map(([binding, objects]) => [binding, createBucket(objects)] as const)),
}

export const waitUntil = (promise: Promise<unknown>): void => {
  pendingTasks.add(promise)
  const settle = () => pendingTasks.delete(promise)
  void promise.then(settle, settle)
}

export const flushWaitUntil = async (): Promise<void> => {
  while (pendingTasks.size > 0) {
    await Promise.allSettled(pendingTasks)
  }
}
