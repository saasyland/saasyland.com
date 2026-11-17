import "@tanstack/react-start/server-only"

import type { models } from "@polar-sh/sdk/2026-10"
import { type SQL, sql } from "drizzle-orm"

import { user } from "~/src/modules/user/user.schema"

export const polarCustomerAccount = ({ external_id: externalId }: Pick<models.OrderCustomer, "external_id">): SQL =>
  typeof externalId === "string" ? sql`(select ${user.id} from ${user} where ${user.id} = ${externalId})` : sql`null`
