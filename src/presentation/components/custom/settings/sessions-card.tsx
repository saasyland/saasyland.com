import type { JSX } from "react"

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"

import { SESSION_QUERY_KEYS } from "~/src/modules/session/session.constants"
import { getActiveSessionsQuery } from "~/src/modules/session/use-cases/get-active-sessions"
import { revokeOtherSessionsMutation } from "~/src/modules/session/use-cases/revoke-other-sessions"

import { useErrorMessage } from "~/src/hooks/use-error-message"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"

import { SessionRow } from "~/src/presentation/components/custom/settings/session-row"

export const SessionsCard = (): JSX.Element => {
  const t = useTranslations("auth.security.sessions")

  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()

  const sessions = useSuspenseQuery(getActiveSessionsQuery).data
  const currentSessionId = useSuspenseQuery(getCurrentSessionQuery).data?.session.id

  const revokeOtherSessions = useMutation({
    ...revokeOtherSessionsMutation,
    onError: (error) => {
      toast.error(errorMessage(error))
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEYS.ALL })
      toast.success(t("othersRevoked"))
    },
  })

  const current = sessions.filter(({ id }) => id === currentSessionId)
  const others = sessions.filter(({ id }) => id !== currentSessionId)

  return (
    <Card>
      <CardHeader className="border-b">
        <CardTitle>
          <h2>{t("title")}</h2>
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent className="px-0">
        <ul className="divide-y divide-border">
          {[...current, ...others].map((session) => (
            <SessionRow isCurrent={session.id === currentSessionId} key={session.id} session={session} />
          ))}
        </ul>
        {others.length === 0 && <p className="px-(--card-spacing) pt-3 text-sm text-muted-foreground">{t("noOthers")}</p>}
      </CardContent>
      {others.length > 0 && (
        <CardFooter className="justify-end">
          <Button
            isPending={revokeOtherSessions.isPending}
            onPress={() => {
              revokeOtherSessions.mutate()
            }}
            size="sm"
            variant="outline"
          >
            {t("revokeOthers")}
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}
