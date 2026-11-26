import { PolarRateLimitError } from "@polar-sh/sdk"
import { createPolarCore, type models } from "@polar-sh/sdk/2026-10"
import { createOrdersService } from "@polar-sh/sdk/2026-10/services/orders"
import { and, asc, eq, isNull, or } from "drizzle-orm"
import { mkdir, readFile, rm, writeFile } from "node:fs/promises"
import { join } from "node:path"
import process from "node:process"
import { setTimeout as sleep } from "node:timers/promises"
import { parseEnv } from "node:util"
import * as zod from "zod"

import { POLAR_SERVER } from "~/src/integrations/polar/polar.constants"

import { polarOrderAmounts } from "~/src/modules/order/order.polar"
import { order } from "~/src/modules/order/order.schema"

import { MILLISECONDS_PER_SECOND } from "~/src/lib/duration"

import { D1_ENVIRONMENTS, executeD1, inline, sqlBuilder } from "./d1-execute.ts"
import { scriptArguments } from "./run-command.ts"

const APPLY_FLAG = "--apply"
const DEFAULT_RETRY_AFTER_SECONDS = 60
const STATEMENTS_DIRECTORY = ".wrangler/tmp"
const USAGE = `Usage: bun run orders:backfill-amounts:<local|preview|production> [${APPLY_FLAG}]`

const environmentSchema = zod.enum(D1_ENVIRONMENTS)
const argumentsSchema = zod.union([zod.tuple([environmentSchema]), zod.tuple([environmentSchema, zod.literal(APPLY_FLAG)])])
const settingsSchema = zod.object({ POLAR_ACCESS_TOKEN: zod.string().trim().nonempty(), POLAR_SERVER: zod.enum(POLAR_SERVER) })
const pendingSchema = zod.object({ id: zod.string() })

const parsedArguments = argumentsSchema.safeParse(scriptArguments())
if (!parsedArguments.success) {
  throw new Error(USAGE)
}

const [environment, flag] = parsedArguments.data
const apply = flag === APPLY_FLAG
const settings = settingsSchema.parse(parseEnv(await readFile(`.env.${environment}`, "utf8")))
const orders = createOrdersService(createPolarCore({ accessToken: settings.POLAR_ACCESS_TOKEN, environment: settings.POLAR_SERVER }))

const lacksAmounts = or(isNull(order.subtotalAmount), isNull(order.netAmount), isNull(order.refundedTaxAmount))

const execute = async (input: readonly ["--command" | "--file", string]): Promise<unknown[]> => {
  const results = await executeD1({ environment, input })
  return results.flat()
}

const pendingOrders = async (): Promise<string[]> => {
  const query = sqlBuilder.select({ id: order.id }).from(order).where(lacksAmounts).orderBy(asc(order.placedAt)).toSQL()
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

const amountsStatements = async (orderId: string): Promise<string[]> => {
  try {
    const amounts = polarOrderAmounts(await readOrder(orderId))
    process.stdout.write(
      `${orderId}: subtotal ${String(amounts.subtotalAmount)}, net ${String(amounts.netAmount)}, refunded tax ${String(amounts.refundedTaxAmount)}\n`,
    )
    const update = sqlBuilder
      .update(order)
      .set(amounts)
      .where(and(eq(order.id, orderId), lacksAmounts))

    return [`${inline(update.toSQL())};`]
  } catch (error) {
    process.stdout.write(`Polar did not return order ${orderId}: ${String(error)}\n`)
    return []
  }
}

const applyStatements = async (statements: readonly string[]): Promise<void> => {
  const path = join(STATEMENTS_DIRECTORY, `backfill-order-amounts.${environment}.sql`)
  await mkdir(STATEMENTS_DIRECTORY, { recursive: true })
  await writeFile(path, statements.join("\n"))
  await execute(["--file", path])
  await rm(path)
}

const reportDryRun = (pending: readonly string[], statements: readonly string[]): void => {
  process.stdout.write(
    `Dry run: ${String(statements.length)} of ${String(pending.length)} orders would be copied. Run it again with ${APPLY_FLAG} to write them.\n`,
  )
  if (statements.length < pending.length) {
    process.exitCode = 1
  }
}

const writeAndReport = async (pending: readonly string[], statements: readonly string[]): Promise<void> => {
  if (statements.length > 0) {
    await applyStatements(statements)
  }

  const remaining = await pendingOrders()
  process.stdout.write(
    `Copied ${String(pending.length - remaining.length)} of ${String(pending.length)} orders. ${String(remaining.length)} still have no amounts.\n`,
  )
  if (remaining.length > 0) {
    process.exitCode = 1
  }
}

const backfill = async (): Promise<void> => {
  process.stdout.write(
    `Copying the subtotal, net amount and refunded tax of orders from the Polar ${settings.POLAR_SERVER} server into the ${environment} database\n`,
  )

  const pending = await pendingOrders()
  if (pending.length === 0) {
    process.stdout.write("Nothing to copy: every order already has its amounts.\n")
    return
  }

  const statementsPerOrder = await Array.fromAsync(pending, amountsStatements)
  const statements = statementsPerOrder.flat()
  if (!apply) {
    reportDryRun(pending, statements)
    return
  }

  await writeAndReport(pending, statements)
}

await backfill()
