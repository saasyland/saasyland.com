import { type Node, findNodeAtLocation, getNodeValue, parseTree } from "jsonc-parser"
import { readFileSync } from "node:fs"
import { describe, expect, it } from "vite-plus/test"

import { DEPLOYED_HOSTS, ENVIRONMENT } from "~/src/modules/_core/constants/api"

const WRANGLER = readFileSync("wrangler.jsonc", "utf8")
const BLANK_LINE = /\n[ \t]*\n/u
const SECRET_NAME = /[A-Z][A-Z0-9_]*/gu
const VARIABLE_NAME = /^[A-Z][A-Z0-9_]*(?==)/gmu

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

  it.each([ENVIRONMENT.PREVIEW, ENVIRONMENT.PRODUCTION])("serves %s on its host in DEPLOYED_HOSTS", (environment) => {
    expect(getNodeValue(nodeAt(["env", environment, "routes"]))).toEqual([{ custom_domain: true, pattern: DEPLOYED_HOSTS[environment] }])
  })
})
