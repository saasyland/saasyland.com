import { queryOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"

import { fromMinorUnits } from "~/src/modules/_core/constants/currency"
import { DEFAULT_CURRENCY_CODE } from "~/src/modules/_core/constants/pricing"
import { LICENSE_QUERY_KEYS } from "~/src/modules/license/license.constants"
import type { License } from "~/src/modules/license/license.types"
import { upgradePrice } from "~/src/modules/license/license.upgrade-price"
import { licenseZodSchemas } from "~/src/modules/license/license.zod"
import { getLicense } from "~/src/modules/license/use-cases/get-license"

export const getUpgradePrice = createServerFn({ method: "GET" })
  .middleware([authorized()])
  .validator((input: License["getUpgradePrice"]) => licenseZodSchemas.getUpgradePrice.parse(input))
  .handler(async ({ context, data: { tier } }) => {
    const upgrade = await upgradePrice(await getLicense(context.auth.user.id), tier, context.requestHeaders)

    if (upgrade === undefined) {
      return { upgrade: undefined }
    }

    return {
      upgrade: {
        amount: fromMinorUnits(upgrade.amount, DEFAULT_CURRENCY_CODE),
        credit: fromMinorUnits(upgrade.credit, DEFAULT_CURRENCY_CODE),
        fromTier: upgrade.fromTier,
        price: fromMinorUnits(upgrade.price, DEFAULT_CURRENCY_CODE),
      },
    }
  })

export const upgradePriceQuery = (input: License["getUpgradePrice"]) =>
  queryOptions({ queryFn: () => getUpgradePrice({ data: input }), queryKey: [...LICENSE_QUERY_KEYS.UPGRADE_PRICE, input.tier] })
