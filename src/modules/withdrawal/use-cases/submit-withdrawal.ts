import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"
import { getRequest } from "@tanstack/react-start/server"

import { RATE_LIMITS, withRateLimit } from "~/src/integrations/better-auth/auth.middleware"
import { getRequestSession } from "~/src/integrations/better-auth/auth.session"

import { recordWithdrawal } from "~/src/modules/withdrawal/use-cases/record-withdrawal"
import { WITHDRAWAL_CHANNEL, WITHDRAWAL_MUTATION_KEYS } from "~/src/modules/withdrawal/withdrawal.constants"
import { matchContract } from "~/src/modules/withdrawal/withdrawal.contracts"
import type { Withdrawal } from "~/src/modules/withdrawal/withdrawal.types"
import { withdrawalZodSchemas } from "~/src/modules/withdrawal/withdrawal.zod"

import { trustedRequestOrigin } from "~/src/lib/request-origin"

export const submitWithdrawal = createServerFn({ method: "POST" })
  .middleware([withRateLimit("submit-withdrawal", RATE_LIMITS.SENSITIVE)])
  .validator((input: Withdrawal["submitWithdrawal"]) => withdrawalZodSchemas.submitWithdrawal.parse(input))
  .handler(async ({ data }) => {
    const request = getRequest()
    const origin = trustedRequestOrigin(request)
    const session = await getRequestSession(request)
    const userId = session?.user.id
    const contract = await matchContract({ email: data.email, reference: data.reference, userId }, new Date())

    return recordWithdrawal({
      ...data,
      channel: session ? WITHDRAWAL_CHANNEL.ACCOUNT : WITHDRAWAL_CHANNEL.PUBLIC,
      contract,
      origin,
      userId,
    })
  })

export const submitWithdrawalMutation = mutationOptions({
  mutationFn: (data: Withdrawal["submitWithdrawal"]) => submitWithdrawal({ data }),
  mutationKey: WITHDRAWAL_MUTATION_KEYS.SUBMIT,
})
