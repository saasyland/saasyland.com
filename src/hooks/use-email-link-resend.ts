import { useState } from "react"

import { type UseMutationOptions, useMutation } from "@tanstack/react-query"
import { toast } from "sonner"

import { RESEND_COOLDOWN_SECONDS } from "~/src/modules/verification/verification.constants"

import { useCountdown } from "~/src/hooks/use-countdown"
import { useErrorMessage } from "~/src/hooks/use-error-message"

import { MILLISECONDS_PER_SECOND } from "~/src/lib/duration"

type LinkResult = { readonly retryAfterSeconds: number; readonly sent: false } | { readonly sent: true }

type LinkMutation<Input> = Pick<UseMutationOptions<LinkResult, Error, Input>, "mutationFn" | "mutationKey">

export type ResendOutcome = { readonly email: string; readonly sent: true } | { readonly retryAt: Date; readonly sent: false }

export interface EmailLinkResend<Input> {
  readonly cooldownSeconds: number
  readonly isPending: boolean
  readonly outcome: ResendOutcome | undefined
  readonly send: (input: Input) => void
}

export const useEmailLinkResend = <Input extends { readonly email: string }>(link: LinkMutation<Input>): EmailLinkResend<Input> => {
  const errorMessage = useErrorMessage()
  const [outcome, setOutcome] = useState<ResendOutcome>()

  const { remainingSeconds, start } = useCountdown()

  const resend = useMutation({
    ...link,
    onError: (error) => {
      toast.error(errorMessage(error))
    },
    onSuccess: (result, { email }) => {
      if (result.sent) {
        setOutcome({ email, sent: true })
        start(RESEND_COOLDOWN_SECONDS)
        return
      }
      setOutcome({ retryAt: new Date(Date.now() + result.retryAfterSeconds * MILLISECONDS_PER_SECOND), sent: false })
      start(result.retryAfterSeconds)
    },
  })

  return {
    cooldownSeconds: remainingSeconds,
    isPending: resend.isPending,
    outcome,
    send: (input) => {
      if (resend.isPending || remainingSeconds > 0) {
        return
      }
      resend.mutate(input)
    },
  }
}
