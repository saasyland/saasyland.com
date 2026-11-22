import type { JSX } from "react"

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query"
import { Laptop, Smartphone } from "lucide-react"
import { toast } from "sonner"
import { useFormatter, useTranslations } from "use-intl/react"

import type { AuthActiveSession } from "~/src/integrations/better-auth/auth.types"

import { SESSION_QUERY_KEYS } from "~/src/modules/session/session.constants"
import { sessionDevice } from "~/src/modules/session/session.utils"
import { getActiveSessionsQuery } from "~/src/modules/session/use-cases/get-active-sessions"
import { revokeSessionMutation } from "~/src/modules/session/use-cases/revoke-session"

import { useErrorMessage } from "~/src/hooks/use-error-message"

import { Badge } from "~/src/presentation/components/shadcn/badge"
import { Button } from "~/src/presentation/components/shadcn/button"

export const useSessionDeviceName = (): ((session: { readonly userAgent?: string | null | undefined }) => string) => {
  const t = useTranslations("auth.security.sessions")

  return (session) => {
    const { browser, os } = sessionDevice(session)
    if (browser !== undefined && os !== undefined) {
      return t("device", { browser, os })
    }
    return browser ?? os ?? t("unknownDevice")
  }
}

interface SessionRowProps {
  readonly isCurrent: boolean
  readonly session: AuthActiveSession
}

export const SessionRow = ({ isCurrent, session }: SessionRowProps): JSX.Element => {
  const t = useTranslations()
  const format = useFormatter()

  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()

  const { dataUpdatedAt } = useSuspenseQuery(getActiveSessionsQuery)
  const deviceName = useSessionDeviceName()

  const revokeSession = useMutation({
    ...revokeSessionMutation,
    onError: (error) => {
      toast.error(errorMessage(error))
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEYS.ALL })
      toast.success(t("auth.security.sessions.revoked"))
    },
  })

  const { isMobile } = sessionDevice(session)
  const device = deviceName(session)
  const location = session.country === null ? t("auth.security.sessions.unknownLocation") : t(`countries.${session.country}`)
  const lastActive = t("auth.security.sessions.activeAgo", { time: format.relativeTime(session.updatedAt, dataUpdatedAt) })
  const activity = isCurrent ? t("auth.security.sessions.activeNow") : lastActive
  const details = [location, session.ipAddress, activity].filter((detail) => detail !== null && detail !== "")

  return (
    <li className="flex items-center justify-between gap-4 px-(--card-spacing) py-3">
      <div className="flex min-w-0 items-center gap-3">
        <div className="flex size-9 shrink-0 items-center justify-center rounded-md border border-border bg-secondary text-muted-foreground">
          {isMobile && <Smartphone aria-hidden className="size-4" />}
          {!isMobile && <Laptop aria-hidden className="size-4" />}
        </div>
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-sm font-medium text-foreground">{device}</p>
            {isCurrent && <Badge variant="accent">{t("auth.security.sessions.thisDevice")}</Badge>}
          </div>
          <p className="text-spec text-pretty text-muted-foreground">{details.join(t("auth.security.sessions.separator"))}</p>
          <p className="text-spec text-muted-foreground">{t("auth.security.sessions.signedIn", { date: session.createdAt })}</p>
        </div>
      </div>
      {!isCurrent && (
        <Button
          aria-label={t("auth.security.sessions.revokeLabel", { device })}
          className="shrink-0"
          isPending={revokeSession.isPending}
          onPress={() => {
            revokeSession.mutate({ sessionId: session.id })
          }}
          size="sm"
          variant="outline"
        >
          {t("auth.security.sessions.revoke")}
        </Button>
      )}
    </li>
  )
}
