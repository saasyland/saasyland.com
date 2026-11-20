import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { LICENSE_QUERY_KEYS } from "~/src/modules/license/license.constants"
import { getLicense } from "~/src/modules/license/use-cases/get-license"

export const getCurrentLicenseKey = createServerFn({ method: "GET" })
  .middleware([authorized()])
  .handler(async ({ context: { auth } }) => {
    if (!auth.user.emailVerified) {
      return { key: undefined }
    }

    const license = await getLicense(auth.user.id)

    return { key: license?.key }
  })

export const currentLicenseKeyQuery = queryOptions({ queryFn: () => getCurrentLicenseKey(), queryKey: LICENSE_QUERY_KEYS.KEY })
