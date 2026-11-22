import { API_ENDPOINT } from "@saasyland/stack/api"
import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { inArray } from "drizzle-orm"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { db } from "~/src/integrations/drizzle-orm/drizzle.database"
import { polar } from "~/src/integrations/polar/polar.config"

import {
  LICENSE_ACTIVATIONS_STALE_MS,
  LICENSE_ACTIVATIONS_TIMEOUT_SECONDS,
  LICENSE_MACHINES,
  LICENSE_QUERY_KEYS,
} from "~/src/modules/license/license.constants"
import { license } from "~/src/modules/license/license.schema"
import type { License } from "~/src/modules/license/license.types"
import { licenseZodSchemas } from "~/src/modules/license/license.zod"

const platformSchema = API_ENDPOINT.ACTIVATE.request.shape.body.pick({ platform: true })

const readMachines = async (polarLicenseKeyId: string | null) => {
  if (polarLicenseKeyId === null || polarLicenseKeyId.length === 0) {
    return { state: LICENSE_MACHINES.NO_KEY }
  }

  try {
    const { activations, limit_activations: limit } = await polar.licenseKeys.get(polarLicenseKeyId, {
      timeout: LICENSE_ACTIVATIONS_TIMEOUT_SECONDS,
    })

    return {
      activations: activations
        .map(({ created_at: createdAt, id, label, meta }) => ({
          createdAt: new Date(createdAt),
          id,
          label,
          platform: platformSchema.safeParse(meta).data?.platform,
        }))
        .toSorted((first, second) => first.createdAt.getTime() - second.createdAt.getTime()),
      limit,
      state: LICENSE_MACHINES.LISTED,
    }
  } catch {
    return { state: LICENSE_MACHINES.UNAVAILABLE }
  }
}

export const getUserActivations = createServerFn({ method: "GET" })
  .middleware([authorized({ user: ["get"] })])
  .validator((input: License["getUserActivations"]) => licenseZodSchemas.getUserActivations.parse(input))
  .handler(async ({ data: { userIds } }) => {
    const rows = await db
      .select({ polarLicenseKeyId: license.polarLicenseKeyId, userId: license.userId })
      .from(license)
      .where(inArray(license.userId, userIds))

    const machines = await Promise.all(
      rows.map(async ({ polarLicenseKeyId, userId }) => Object.assign(await readMachines(polarLicenseKeyId), { userId })),
    )

    return { machines }
  })

export const userActivationsQuery = (input: License["getUserActivations"]) =>
  queryOptions({
    queryFn: () => getUserActivations({ data: input }),
    queryKey: [...LICENSE_QUERY_KEYS.USER_ACTIVATIONS, input],
    staleTime: LICENSE_ACTIVATIONS_STALE_MS,
  })
