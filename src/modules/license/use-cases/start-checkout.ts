import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"
import { getIP } from "better-auth/api"

import { affonsoReferralMetadata } from "~/src/integrations/affonso/affonso.referral"
import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { auth } from "~/src/integrations/better-auth/auth.server"
import { polar } from "~/src/integrations/polar/polar.config"
import { POLAR_CHECKOUT_ID_PLACEHOLDER } from "~/src/integrations/polar/polar.constants"
import { localizePathname } from "~/src/integrations/use-intl/i18n.paths"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { LICENSE_MUTATION_KEYS, LICENSE_STATUS } from "~/src/modules/license/license.constants"
import { pppDiscountId } from "~/src/modules/license/license.ppp"
import type { License } from "~/src/modules/license/license.types"
import { POLAR_PRODUCT_IDS } from "~/src/modules/license/license.utils"
import { licenseZodSchemas } from "~/src/modules/license/license.zod"
import { getLicense } from "~/src/modules/license/use-cases/get-license"

import { ROUTES } from "~/src/routes"

export const startCheckout = createServerFn({ method: "POST" })
  .middleware([authorized()])
  .validator((input: License["startCheckout"]) => licenseZodSchemas.startCheckout.parse(input))
  .handler(async ({ context, data: { locale, tier } }) => {
    const { user } = context.auth
    const current = await getLicense(user.id)
    if (current?.status === LICENSE_STATUS.ACTIVE) {
      throw new AppError(ERROR_CODES.LICENSE_ALREADY_ACTIVE)
    }

    const discountId = await pppDiscountId(context.requestHeaders, POLAR_PRODUCT_IDS[tier])
    const successUrl = new URL(
      `${localizePathname({ locale, pathname: ROUTES.APP })}?checkoutId=${POLAR_CHECKOUT_ID_PLACEHOLDER}`,
      getRequest().url,
    )
    const { url } = await polar.checkouts.create({
      allow_discount_codes: false,
      customer_email: user.email,
      customer_ip_address: getIP(context.requestHeaders, auth.options),
      customer_name: user.name,
      external_customer_id: user.id,
      metadata: affonsoReferralMetadata(context.requestHeaders),
      products: [POLAR_PRODUCT_IDS[tier]],
      success_url: successUrl.toString(),
      ...(discountId === undefined ? {} : { discount_id: discountId }),
    })

    return { url }
  })

export const startCheckoutMutation = mutationOptions({
  mutationFn: (data: License["startCheckout"]) => startCheckout({ data }),
  mutationKey: LICENSE_MUTATION_KEYS.START_CHECKOUT,
})
