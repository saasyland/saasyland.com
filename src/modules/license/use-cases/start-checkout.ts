import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { affonsoReferralMetadata } from "~/src/integrations/affonso/affonso.referral"
import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { POLAR_PRODUCT_IDS } from "~/src/integrations/polar/polar.constants"

import { LICENSE_MUTATION_KEYS } from "~/src/modules/license/license.constants"
import { pppDiscountId } from "~/src/modules/license/license.ppp"
import type { License } from "~/src/modules/license/license.types"
import { licenseZodSchemas } from "~/src/modules/license/license.zod"

export const startCheckout = createServerFn({ method: "POST" })
  .middleware([authorized()])
  .validator((input: License["startCheckout"]) => licenseZodSchemas.startCheckout.parse(input))
  .handler(async ({ context, data: { tier } }) => {
    const discountId = await pppDiscountId(context.requestHeaders, POLAR_PRODUCT_IDS[tier])
    const { url } = await auth.api.checkout({
      body: {
        allow_discount_codes: false,
        metadata: affonsoReferralMetadata(context.requestHeaders),
        slug: tier,
        ...(discountId === undefined ? {} : { discount_id: discountId }),
      },
      headers: context.requestHeaders,
    })

    return { url }
  })

export const startCheckoutMutation = mutationOptions({
  mutationFn: (data: License["startCheckout"]) => startCheckout({ data }),
  mutationKey: LICENSE_MUTATION_KEYS.START_CHECKOUT,
})
