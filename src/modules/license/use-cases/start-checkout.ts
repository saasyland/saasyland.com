import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { POLAR_PRODUCT_IDS } from "~/src/integrations/polar/polar.constants"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { LICENSE_MUTATION_KEYS, LICENSE_STATUS } from "~/src/modules/license/license.constants"
import { pppDiscountId } from "~/src/modules/license/license.ppp"
import type { License } from "~/src/modules/license/license.types"
import { licenseZodSchemas } from "~/src/modules/license/license.zod"
import { getLicense } from "~/src/modules/license/use-cases/get-license"

export const startCheckout = createServerFn({ method: "POST" })
  .middleware([authorized()])
  .validator((input: License["startCheckout"]) => licenseZodSchemas.startCheckout.parse(input))
  .handler(async ({ context, data: { tier } }) => {
    const current = await getLicense(context.auth.user.id)
    if (current?.status === LICENSE_STATUS.ACTIVE) {
      throw new AppError(ERROR_CODES.LICENSE_ALREADY_ACTIVE)
    }

    const discountId = await pppDiscountId(context.requestHeaders, POLAR_PRODUCT_IDS[tier])
    const { url } = await auth.api.checkout({
      body: { allow_discount_codes: false, slug: tier, ...(discountId === undefined ? {} : { discount_id: discountId }) },
      headers: context.requestHeaders,
    })

    return { url }
  })

export const startCheckoutMutation = mutationOptions({
  mutationFn: (data: License["startCheckout"]) => startCheckout({ data }),
  mutationKey: LICENSE_MUTATION_KEYS.START_CHECKOUT,
})
