import { useCallback } from "react"

import { useQueryClient } from "@tanstack/react-query"
import { useRouter, useRouterState } from "@tanstack/react-router"

import { authSearchSchema } from "~/src/integrations/better-auth/auth.zod"

import { ROUTES } from "~/src/routes"

type AuthPage = typeof ROUTES.AUTH_CALLBACK | typeof ROUTES.SIGN_IN

export const useAuthRedirect = () => {
  const queryClient = useQueryClient()
  const router = useRouter()

  const redirect = useRouterState({ select: ({ location }) => authSearchSchema.parse(location.search).redirect })

  const hrefWithRedirect = (page: AuthPage): string => router.buildLocation({ search: { redirect }, to: page }).publicHref

  const finishSignIn = useCallback(async () => {
    queryClient.clear()
    router.clearCache()
    await router.navigate({ replace: true, search: { redirect }, to: ROUTES.AUTH_CALLBACK })
  }, [queryClient, redirect, router])

  return { finishSignIn, hrefWithRedirect, redirect }
}
