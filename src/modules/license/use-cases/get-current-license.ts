import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { LICENSE_POLL_MS, LICENSE_QUERY_KEYS, LICENSE_STATUS } from "~/src/modules/license/license.constants"
import type { License } from "~/src/modules/license/license.types"
import { getLicense } from "~/src/modules/license/use-cases/get-license"

export const getCurrentLicense = createServerFn({ method: "GET" })
  .middleware([authorized()])
  .handler(async ({ context }) => {
    const row = await getLicense(context.auth.user.id)

    if (row === undefined) {
      return { license: undefined }
    }

    const { key: _key, ...license } = row

    return { license }
  })

export const currentLicenseQuery = queryOptions({ queryFn: () => getCurrentLicense(), queryKey: LICENSE_QUERY_KEYS.CURRENT })

const setupPollInterval = (
  license: Pick<License["select"], "activatedAt" | "deliveredAt" | "polarLicenseKeyId" | "status"> | undefined,
): number | false => {
  if (license?.status !== LICENSE_STATUS.ACTIVE) {
    return false
  }

  if (license.polarLicenseKeyId === null) {
    return LICENSE_POLL_MS.KEY
  }

  if (license.activatedAt === null || license.deliveredAt === null) {
    return LICENSE_POLL_MS.SETUP
  }

  return false
}

export const licenseSetupQuery = queryOptions({
  ...currentLicenseQuery,
  refetchInterval: ({ state }) => setupPollInterval(state.data?.license),
})
