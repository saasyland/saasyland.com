import type { JSX } from "react"

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useTranslations } from "use-intl/react"

import { getCurrentSessionQuery } from "~/src/integrations/better-auth/auth.session"

import { SESSION_QUERY_KEYS } from "~/src/modules/session/session.constants"
import { getActiveSessionsQuery } from "~/src/modules/session/use-cases/get-active-sessions"
import { revokeOtherSessionsMutation } from "~/src/modules/session/use-cases/revoke-other-sessions"

import { useErrorMessage } from "~/src/hooks/use-error-message"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Card } from "~/src/presentation/components/shadcn/card"

import { SessionRow } from "~/src/presentation/components/custom/admin/settings/session-row"

export const SettingsSessions = (): JSX.Element => {
  const t = useTranslations("pages.admin.settings.security.sessions")

  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()

  const sessions = useSuspenseQuery(getActiveSessionsQuery).data
  const currentSessionId = useSuspenseQuery(getCurrentSessionQuery).data?.session.id

  const revokeOtherSessions = useMutation({
    ...revokeOtherSessionsMutation,
    onError: (error) => {
      toast.error(errorMessage(error))
    },
    onSuccess: () => {
      toast.success(t("feedback.logoutAllSuccess"))
      return queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEYS.ALL })
    },
  })

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col justify-between gap-4 border-b border-border p-5 sm:flex-row sm:items-center">
        <div>
          <h2 className="mb-1 text-base font-medium text-foreground">{t("title")}</h2>
          <p className="text-xs text-muted-foreground">{t("description")}</p>
        </div>
        <Button
          className="h-8 shrink-0 px-3 text-xs"
          isDisabled={revokeOtherSessions.isPending}
          onPress={() => {
            revokeOtherSessions.mutate()
          }}
          size="sm"
          variant="outline"
        >
          {revokeOtherSessions.isPending && <Loader2 className="size-4 animate-spin" />}
          {!revokeOtherSessions.isPending && t("logoutAll")}
        </Button>
      </div>

      <div className="divide-y divide-border">
        {sessions.map((session) => (
          <SessionRow isCurrent={session.id === currentSessionId} key={session.id} session={session} />
        ))}
      </div>
    </Card>
  )
}
