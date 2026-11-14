import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { LICENSE_QUERY_KEYS } from "~/src/modules/license/license.constants"
import { getLicense } from "~/src/modules/license/use-cases/get-license"

export const getCurrentLicense = createServerFn({ method: "GET" })
  .middleware([authorized()])
  .handler(async ({ context }) => ({ license: await getLicense(context.auth.user.id) }))

export const currentLicenseQuery = queryOptions({ queryFn: () => getCurrentLicense(), queryKey: LICENSE_QUERY_KEYS.CURRENT })
