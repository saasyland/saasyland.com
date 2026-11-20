import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { LICENSE_QUERY_KEYS } from "~/src/modules/license/license.constants"
import { getLicense } from "~/src/modules/license/use-cases/get-license"

export const getCurrentLicense = createServerFn({ method: "GET" })
  .middleware([authorized()])
  .handler(async ({ context }) => {
    const row = await getLicense(context.auth.user.id)

    if (row === undefined) {
      return { license: row }
    }

    const { key: _key, ...license } = row

    return { license }
  })

export const currentLicenseQuery = queryOptions({ queryFn: () => getCurrentLicense(), queryKey: LICENSE_QUERY_KEYS.CURRENT })
