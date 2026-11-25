import { readFile, readdir } from "node:fs/promises"
import { join } from "node:path"

import type { APIRequestContext } from "@playwright/test"
import * as zod from "zod"

import { ownAddress } from "./address"

const SERVER_BUILD = "dist/server/assets"
const SERVER_FUNCTION_PATH = "/_serverFn/"
const SERVER_FUNCTION_ENTRY = /id: "(?<id>[\da-f]{64}(?:_\d+)?)",\s*name: "(?<name>\w+)",\s*filename: "(?<file>[^"]+)"/gu
const GET_FUNCTION = /createServerFn\(\{ method: "GET" \}\)/u

const entrySchema = zod.object({ file: zod.string(), id: zod.string(), name: zod.string() })

export interface ServerFunction {
  readonly file: string
  readonly id: string
  readonly method: string
  readonly name: string
}

const methodOf = async ({ file, name }: zod.infer<typeof entrySchema>): Promise<string> => {
  const source = await readFile(file, "utf8")
  const [declaration] = source.slice(source.indexOf(`export const ${name} = `)).split("\n")
  return GET_FUNCTION.test(declaration ?? "") ? "GET" : "POST"
}

export const builtServerFunctions = async (): Promise<ServerFunction[]> => {
  const files = (await readdir(SERVER_BUILD)).filter((file) => file.endsWith(".js"))
  const chunks = await Promise.all(files.map(async (file) => readFile(join(SERVER_BUILD, file), "utf8")))
  const entries = chunks.flatMap((chunk) => [...chunk.matchAll(SERVER_FUNCTION_ENTRY)].map(({ groups }) => entrySchema.parse(groups)))

  return Promise.all(entries.map(async (entry) => ({ ...entry, method: await methodOf(entry) })))
}

export const builtServerFunction = async (name: string): Promise<ServerFunction> => {
  const found = (await builtServerFunctions()).find((serverFunction) => serverFunction.name === name)
  if (found === undefined) {
    throw new Error(`The build has no server function named ${name}`)
  }
  return found
}

interface ServerFunctionCall {
  readonly address?: string
  readonly origin: string
}

export const callServerFunction = async (
  request: APIRequestContext,
  { id, method }: ServerFunction,
  { address = ownAddress(), origin }: ServerFunctionCall,
): Promise<string> => {
  const response = await request.fetch(`${SERVER_FUNCTION_PATH}${id}`, { headers: { "CF-Connecting-IP": address, Origin: origin }, method })
  return response.text()
}
