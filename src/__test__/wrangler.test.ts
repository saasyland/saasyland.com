import { type Node, findNodeAtLocation, getNodeValue, parseTree } from "jsonc-parser"
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vite-plus/test"
import * as zod from "zod"

import { DEPLOYED_HOSTS, ENVIRONMENT } from "~/src/modules/_core/constants/api"

const WRANGLER = readFileSync("wrangler.jsonc", "utf8")
const BLANK_LINE = /\n[ \t]*\n/u
const SECRET_NAME = /[A-Z][A-Z0-9_]*/gu
const VARIABLE_NAME = /^[A-Z][A-Z0-9_]*(?==)/gmu

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

const secretBlocks = (environment: string): string[][] => {
  const { length, offset } = nodeAt(["env", environment, "secrets", "required"])

  return WRANGLER.slice(offset, offset + length)
    .split(BLANK_LINE)
    .map((block) => block.match(SECRET_NAME) ?? [])
}

const bindingNames = (environment: string): Record<string, string[]> => {
  const bindings = environmentBindingsSchema.parse(getNodeValue(nodeAt(["env", environment])))

  return Object.fromEntries(Object.entries(bindings).map(([kind, entries]) => [kind, entries.map(({ binding }) => binding)]))
}

const variableBlocks = (file: string): string[][] =>
  readFileSync(file, "utf8")
    .trim()
    .split(BLANK_LINE)
    .map((block) => block.match(VARIABLE_NAME) ?? [])

describe("wrangler.jsonc", () => {
  it.each([ENVIRONMENT.DEVELOPMENT, ENVIRONMENT.PREVIEW, ENVIRONMENT.PRODUCTION])(
    "requires the secrets of .env.example in %s, in the same blocks and order",
    (environment) => {
      expect(secretBlocks(environment)).toStrictEqual(variableBlocks(".env.example"))
    },
  )

  it("requires the secrets of .env.test in the test Worker, in the same blocks and order", () => {
    expect(secretBlocks(ENVIRONMENT.TEST)).toStrictEqual(variableBlocks(".env.test"))
  })

  it.each([ENVIRONMENT.PREVIEW, ENVIRONMENT.PRODUCTION, ENVIRONMENT.TEST])(
    "binds the D1 databases, KV namespaces and R2 buckets of development in %s",
    (environment) => {
      expect(bindingNames(environment)).toStrictEqual(bindingNames(ENVIRONMENT.DEVELOPMENT))
    },
  )

  it.each([ENVIRONMENT.PREVIEW, ENVIRONMENT.PRODUCTION])("serves %s on its host in DEPLOYED_HOSTS", (environment) => {
    expect(getNodeValue(nodeAt(["env", environment, "routes"]))).toEqual([{ custom_domain: true, pattern: DEPLOYED_HOSTS[environment] }])
  })
})
