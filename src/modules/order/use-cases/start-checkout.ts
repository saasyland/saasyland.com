import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { authorized, withRateLimit } from "~/src/integrations/better-auth/auth.middleware"

import { AppError, ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { createCheckout, hasOwnCheckout } from "~/src/modules/order/order.checkout"
import { CHECKOUT_RATE_LIMIT, CHECKOUT_RATE_LIMIT_KIND, ORDER_MUTATION_KEYS } from "~/src/modules/order/order.constants"
import type { Order } from "~/src/modules/order/order.types"
import { orderZodSchemas } from "~/src/modules/order/order.zod"

export const startCheckout = createServerFn({ method: "POST" })
  .middleware([withRateLimit(CHECKOUT_RATE_LIMIT_KIND, CHECKOUT_RATE_LIMIT), authorized()])
  .validator((input: Order["startCheckout"]) => orderZodSchemas.startCheckout.parse(input))
  .handler(({ context, data }) => {
    if (hasOwnCheckout(data.productId)) {
      throw new AppError(ERROR_CODES.FORBIDDEN)
    }

    return createCheckout(context, data)
  })

export const startCheckoutMutation = mutationOptions({
  mutationFn: (data: Order["startCheckout"]) => startCheckout({ data }),
  mutationKey: ORDER_MUTATION_KEYS.START_CHECKOUT,
})
