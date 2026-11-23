import { spawn } from "bun"
import { drizzle } from "drizzle-orm/sqlite-proxy"
import { z } from "zod/v4"

import { ENVIRONMENT } from "~/src/modules/_core/constants/api"

export const DATABASE_BINDING = "DB"

export const D1_ENVIRONMENTS = [ENVIRONMENT.DEVELOPMENT, ENVIRONMENT.PREVIEW, ENVIRONMENT.PRODUCTION] as const

export type D1Environment = (typeof D1_ENVIRONMENTS)[number]

export const sqlBuilder = drizzle(() => Promise.resolve({ rows: [] }))

const PARAMETER = "?"
const SQL_NULL = "NULL"
const JSON_START = /^[[{]/mu
const NO_OUTPUT = "{}"
const NOT_FOUND = -1

const sqlParameterSchema = z.union([z.string(), z.number(), z.null()])
const statementResultSchema = z.object({ results: z.array(z.unknown()) })
const outputSchema = z.array(statementResultSchema).min(1)
const noteSchema = z.object({ text: z.string() })
const failureSchema = z.object({ error: z.object({ notes: z.array(noteSchema).default([]), text: z.string() }) })

const jsonOf = (output: string): unknown => {
  const start = output.search(JSON_START)
  return JSON.parse(start === NOT_FOUND ? NO_OUTPUT : output.slice(start))
}

const reasonOf = (output: string): string => {
  const failure = failureSchema.safeParse(jsonOf(output))
  if (!failure.success) {
    return ""
  }

  return [failure.data.error.text, ...failure.data.error.notes.map(({ text }) => text)].join(" ")
}

export const sqlLiteral = (value: unknown): string => {
  const parameter = sqlParameterSchema.parse(value)
  if (parameter === null) {
    return SQL_NULL
  }

  return typeof parameter === "number" ? String(parameter) : `'${parameter.replaceAll("'", "''")}'`
}

export const inline = ({ params, sql }: { params: unknown[]; sql: string }): string => {
  const pending = [...params]
  return sql.replaceAll(PARAMETER, () => sqlLiteral(pending.shift()))
}

export const executeD1 = async ({
  environment,
  input,
}: {
  readonly environment: D1Environment
  readonly input: readonly ["--command" | "--file", string]
}): Promise<unknown[][]> => {
  const location = environment === ENVIRONMENT.DEVELOPMENT ? "--local" : "--remote"
  const child = spawn(
    ["vp", "exec", "wrangler", "d1", "execute", DATABASE_BINDING, "--env", environment, location, "--json", "--yes", ...input],
    { stderr: "inherit", stdin: "inherit", stdout: "pipe" },
  )
  const [output, exitCode] = await Promise.all([new Response(child.stdout).text(), child.exited])
  if (exitCode !== 0) {
    throw new Error(
      `wrangler d1 execute failed on the ${environment} database: ${reasonOf(output)} Run wrangler login with an account that can write to it.`,
    )
  }

  return outputSchema.parse(jsonOf(output)).map(({ results }) => results)
}
