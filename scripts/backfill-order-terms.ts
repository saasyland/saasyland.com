import { PolarRateLimitError } from "@polar-sh/sdk"
import { createPolarCore, type models } from "@polar-sh/sdk/2026-10"
import { createOrdersService } from "@polar-sh/sdk/2026-10/services/orders"
import { and, asc, eq, isNull } from "drizzle-orm"
import { drizzle } from "drizzle-orm/sqlite-proxy"
import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import process from "node:process"
import { setTimeout as sleep } from "node:timers/promises"
import { parseEnv } from "node:util"
import { z } from "zod/v4"

import { ENVIRONMENT } from "~/src/modules/_core/constants/api"
import { polarOrderTerms } from "~/src/modules/order/order.polar"
import { order } from "~/src/modules/order/order.schema"

import { POLAR_SERVER } from "~/src/data/polar"

import { executeD1, inline } from "./d1-execute.ts"

const SCRIPT_ARGUMENTS_START = 2
const MILLISECONDS_PER_SECOND = 1000
const DEFAULT_RETRY_AFTER_SECONDS = 60
const STATEMENTS_DIRECTORY = ".wrangler/tmp"
const USAGE = "Usage: bun run orders:backfill:<local|preview|production>"

const environmentSchema = z.enum([ENVIRONMENT.DEVELOPMENT, ENVIRONMENT.PREVIEW, ENVIRONMENT.PRODUCTION])
const settingsSchema = z.object({ POLAR_ACCESS_TOKEN: z.string().trim().nonempty(), POLAR_SERVER: z.enum(POLAR_SERVER) })
const pendingSchema = z.object({ id: z.string() })

const environment = environmentSchema.safeParse(process.argv[SCRIPT_ARGUMENTS_START])
if (!environment.success) {
  throw new Error(USAGE)
}

const file = `.env.${environment.data}`
const settings = settingsSchema.parse(parseEnv(await readFile(file, "utf8")))
const orders = createOrdersService(createPolarCore({ accessToken: settings.POLAR_ACCESS_TOKEN, environment: settings.POLAR_SERVER }))
const proxy = drizzle(() => Promise.resolve({ rows: [] }))

const execute = async (input: readonly ["--command" | "--file", string]): Promise<unknown[]> => {
  const results = await executeD1({ environment: environment.data, input })
  return results.flat()
}

const pendingOrders = async (): Promise<string[]> => {
  const query = proxy.select({ id: order.id }).from(order).where(isNull(order.discountAmount)).orderBy(asc(order.placedAt)).toSQL()
  const rows = await execute(["--command", inline(query)])

  return rows.map((row) => pendingSchema.parse(row).id)
}

const readOrder = async (orderId: string): Promise<models.Order> => {
  try {
    return await orders.get(orderId)
  } catch (error) {
    if (!(error instanceof PolarRateLimitError)) {
      throw error
    }

    const seconds = error.retryAfter ?? DEFAULT_RETRY_AFTER_SECONDS
    process.stdout.write(`Polar asks to wait ${String(seconds)} s before the next request\n`)
    await sleep(seconds * MILLISECONDS_PER_SECOND)
    return readOrder(orderId)
  }
}

const termsStatement = async (orderId: string): Promise<string | undefined> => {
  try {
    const live = await readOrder(orderId)
    const update = proxy
      .update(order)
      .set(polarOrderTerms(live))
      .where(and(eq(order.id, orderId), isNull(order.discountAmount)))

    return `${inline(update.toSQL())};`
  } catch (error) {
    process.stdout.write(`Polar did not return order ${orderId}: ${String(error)}\n`)
    return undefined
  }
}

const applyStatements = async (statements: readonly string[]): Promise<void> => {
  const path = join(STATEMENTS_DIRECTORY, `backfill-order-terms.${environment.data}.sql`)
  await mkdir(STATEMENTS_DIRECTORY, { recursive: true })
  await writeFile(path, statements.join("\n"))
  await execute(["--file", path])
  await rm(path)
}

const backfill = async (): Promise<void> => {
  process.stdout.write(
    `Copying the discount and billing country of orders from the Polar ${settings.POLAR_SERVER} server into the ${environment.data} database\n`,
  )

  const pending = await pendingOrders()
  if (pending.length === 0) {
    process.stdout.write("Nothing to copy: every order already has its discount and billing country.\n")
    return
  }

  const read = await Array.fromAsync(pending, termsStatement)
  const statements = read.filter((statement) => statement !== undefined)
  if (statements.length > 0) {
    await applyStatements(statements)
  }

  const remaining = await pendingOrders()
  process.stdout.write(
    `Copied ${String(pending.length - remaining.length)} of ${String(pending.length)} orders. ${String(remaining.length)} still have no copy.\n`,
  )
  if (remaining.length > 0) {
    process.exitCode = 1
  }
}

await backfill()
