import { type Node, findNodeAtLocation, getNodeValue, parseTree } from "jsonc-parser"
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vite-plus/test"
import * as zod from "zod"

import { DEPLOYED_HOSTS, ENVIRONMENT } from "~/src/modules/_core/constants/api"

const WRANGLER = readFileSync("wrangler.jsonc", "utf8")
const SECRET_NAME = /[A-Z][A-Z0-9_]*/gu
const VARIABLE_NAME = /^[A-Z][A-Z0-9_]*(?==)/gmu
const AFFONSO_PROGRAM_ID = "AFFONSO_PROGRAM_ID"

const bindingListSchema = zod.array(zod.object({ binding: zod.string() })).default([])
const environmentBindingsSchema = zod.object({
  d1_databases: bindingListSchema,
  kv_namespaces: bindingListSchema,
  r2_buckets: bindingListSchema,
})

const nodeAt = (path: string[]): Node => {
  const tree = parseTree(WRANGLER)
  const node = tree === undefined ? undefined : findNodeAtLocation(tree, path)
  if (node === undefined) {
    throw new Error(`wrangler.jsonc has no ${path.join(".")}`)
  }
  return node
}

const secretNames = (environment: string): string[] => {
  const { length, offset } = nodeAt(["env", environment, "secrets", "required"])

  return WRANGLER.slice(offset, offset + length).match(SECRET_NAME) ?? []
}

const bindingNames = (environment: string): Record<string, string[]> => {
  const bindings = environmentBindingsSchema.parse(getNodeValue(nodeAt(["env", environment])))

  return Object.fromEntries(Object.entries(bindings).map(([kind, entries]) => [kind, entries.map(({ binding }) => binding)]))
}

const remoteFlag = zod.boolean()
const databaseSchema = zod.object({ database_id: zod.string(), remote: remoteFlag })
const namespaceSchema = zod.object({ id: zod.string(), remote: remoteFlag })
const bucketSchema = zod.object({ bucket_name: zod.string(), remote: remoteFlag })
const resourceSchema = zod.object({
  d1_databases: zod.array(databaseSchema),
  kv_namespaces: zod.array(namespaceSchema),
  r2_buckets: zod.array(bucketSchema),
})

const resourcesOf = (environment: string) => {
  const {
    d1_databases: databases,
    kv_namespaces: namespaces,
    r2_buckets: buckets,
  } = resourceSchema.parse(getNodeValue(nodeAt(["env", environment])))

  return {
    ids: [
      ...databases.map(({ database_id: id }) => id),
      ...namespaces.map(({ id }) => id),
      ...buckets.map(({ bucket_name: name }) => name),
    ],
    remote: [...databases, ...namespaces, ...buckets].map(({ remote }) => remote),
  }
}

const variableNames = (file: string): string[] => readFileSync(file, "utf8").match(VARIABLE_NAME) ?? []

const programId = (environment: string): unknown => getNodeValue(nodeAt(["env", environment, "vars", AFFONSO_PROGRAM_ID]))

describe("wrangler.jsonc", () => {
  it.each([ENVIRONMENT.DEVELOPMENT, ENVIRONMENT.PREVIEW, ENVIRONMENT.PRODUCTION])(
    "requires the secrets of .env.example in %s, in the same order",
    (environment) => {
      expect(secretNames(environment)).toStrictEqual(variableNames(".env.example"))
    },
  )

  it("requires the secrets of .env.test in the test Worker, in the same order", () => {
    expect(secretNames(ENVIRONMENT.TEST)).toStrictEqual(variableNames(".env.test"))
  })

  it.each([ENVIRONMENT.PREVIEW, ENVIRONMENT.PRODUCTION, ENVIRONMENT.TEST])(
    "binds the D1 databases, KV namespaces and R2 buckets of development in %s",
    (environment) => {
      expect(bindingNames(environment)).toStrictEqual(bindingNames(ENVIRONMENT.DEVELOPMENT))
    },
  )

  it("runs bun run dev on a local D1 database, KV namespace and R2 buckets, never a remote one", () => {
    expect(resourcesOf(ENVIRONMENT.DEVELOPMENT).remote.every((remote) => !remote)).toBe(true)
  })

  it.each([ENVIRONMENT.PREVIEW, ENVIRONMENT.PRODUCTION])(
    "shares no database, namespace or bucket between development and %s",
    (environment) => {
      const deployed = new Set(resourcesOf(environment).ids)

      expect(resourcesOf(ENVIRONMENT.DEVELOPMENT).ids.filter((id) => deployed.has(id))).toStrictEqual([])
    },
  )

  it.each([ENVIRONMENT.DEVELOPMENT, ENVIRONMENT.PREVIEW])(
    "leaves affiliate tracking off in %s, which takes no real payments",
    (environment) => {
      expect(getNodeValue(nodeAt(["env", environment]))).not.toHaveProperty("vars")
    },
  )

  it("tracks affiliate referrals in production with a programme ID of its own, not the browser tests' dummy", () => {
    expect(programId(ENVIRONMENT.PRODUCTION)).toEqual(expect.any(String))
    expect(programId(ENVIRONMENT.PRODUCTION)).not.toBe(programId(ENVIRONMENT.TEST))
  })

  it.each([ENVIRONMENT.PREVIEW, ENVIRONMENT.PRODUCTION])("serves %s on its host in DEPLOYED_HOSTS", (environment) => {
    expect(getNodeValue(nodeAt(["env", environment, "routes"]))).toEqual([{ custom_domain: true, pattern: DEPLOYED_HOSTS[environment] }])
  })
})
