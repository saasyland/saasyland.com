import { useQuery } from "@tanstack/react-query"

import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"

import { useLastLoginMethod } from "~/src/hooks/use-last-login-method"

import type { HEADER_NAVIGATION } from "~/src/data/navigation"

type HeaderEntry = (typeof HEADER_NAVIGATION)[number]

export const useSignedInVisitor = (): boolean => {
  const { hasSignedInBefore } = useLastLoginMethod()
  const { data } = useQuery({ ...getCurrentSessionQuery, enabled: hasSignedInBefore })

  return data?.user !== undefined
}

export const headerDestination = (entry: HeaderEntry, signedIn: boolean): Pick<HeaderEntry, "key" | "to"> =>
  signedIn && entry.signedIn !== undefined ? entry.signedIn : entry
