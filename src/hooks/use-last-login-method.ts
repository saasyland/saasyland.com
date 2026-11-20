import { useHydrated } from "@tanstack/react-router"
import { createClientOnlyFn } from "@tanstack/react-start"

import { getLastUsedLoginMethod } from "~/src/integrations/better-auth/auth.client"

const readLastLoginMethod = createClientOnlyFn(() => getLastUsedLoginMethod())

export const useLastLoginMethod = (): { readonly hasSignedInBefore: boolean; readonly isLastUsed: (method: string) => boolean } => {
  const hydrated = useHydrated()

  return {
    hasSignedInBefore: hydrated && typeof readLastLoginMethod() === "string",
    isLastUsed: (method) => hydrated && readLastLoginMethod() === method,
  }
}
