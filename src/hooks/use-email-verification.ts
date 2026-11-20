import { type Query, useQuery } from "@tanstack/react-query"

import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"

import { VERIFICATION_POLL_MS } from "~/src/modules/verification/verification.constants"

type SessionQuery = Query<Awaited<ReturnType<NonNullable<typeof getCurrentSessionQuery.queryFn>>>>

const awaitsConfirmation = ({ state }: Pick<SessionQuery, "state">): boolean => state.data?.user.emailVerified === false

interface EmailVerification {
  readonly confirmed: boolean
  readonly unconfirmedEmail: string | undefined
}

export const useEmailVerification = (): EmailVerification => {
  const { data } = useQuery({
    ...getCurrentSessionQuery,
    refetchInterval: (query) => (awaitsConfirmation(query) ? VERIFICATION_POLL_MS : false),
    refetchOnWindowFocus: awaitsConfirmation,
  })

  if (data?.user.emailVerified === false) {
    return { confirmed: false, unconfirmedEmail: data.user.email }
  }

  return { confirmed: data?.user.emailVerified === true, unconfirmedEmail: undefined }
}
