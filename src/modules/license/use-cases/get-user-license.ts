import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { LICENSE_QUERY_KEYS, LICENSE_STATUS } from "~/src/modules/license/license.constants"
import { refundEligibility } from "~/src/modules/license/license.refunds"
import type { License } from "~/src/modules/license/license.types"
import { licenseZodSchemas } from "~/src/modules/license/license.zod"
import { getLicense } from "~/src/modules/license/use-cases/get-license"

export const getUserLicense = createServerFn({ method: "GET" })
  .middleware([authorized({ user: ["get"] })])
  .validator((input: License["getUserLicense"]) => licenseZodSchemas.getUserLicense.parse(input))
  .handler(async ({ data: { userId } }) => {
    const row = await getLicense(userId)

    if (row === undefined) {
      return { license: undefined }
    }

    const { activatedAt, deliveredAt, lessonOpenedAt, purchaseCreatedAt, status, tier, withdrawalConsentAt } = row
    const refund = status === LICENSE_STATUS.ACTIVE ? refundEligibility({ ...row, now: new Date() }) : undefined

    return { license: { activatedAt, deliveredAt, lessonOpenedAt, purchaseCreatedAt, refund, status, tier, withdrawalConsentAt } }
  })

export const userLicenseQuery = (input: License["getUserLicense"]) =>
  queryOptions({
    queryFn: () => getUserLicense({ data: input }),
    queryKey: [...LICENSE_QUERY_KEYS.USER, input],
  })
