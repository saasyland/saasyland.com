import type { JSX } from "react"

import { useMutation, useQueryClient } from "@tanstack/react-query"
import { Laptop, Loader2, Smartphone } from "lucide-react"
import { toast } from "sonner"
import { useFormatter, useTranslations } from "use-intl/react"

import type { AuthActiveSession } from "~/src/integrations/better-auth/auth.types"

import { SESSION_QUERY_KEYS } from "~/src/modules/session/session.constants"
import { revokeSessionMutation } from "~/src/modules/session/use-cases/revoke-session"

import { useErrorMessage } from "~/src/hooks/use-error-message"

import { Badge } from "~/src/presentation/components/shadcn/badge"
import { Button } from "~/src/presentation/components/shadcn/button"

const MOBILE_USER_AGENT_PATTERN = /mobile|iphone|android|ipad|ipod/iu

const deviceLabel = (session: AuthActiveSession): string | undefined => {
  if (session.userAgent !== null && session.userAgent !== "") {
    return session.userAgent
  }

  if (session.ipAddress !== null && session.ipAddress !== "") {
    return session.ipAddress
  }

  return undefined
}

export const SessionRow = ({ isCurrent, session }: { readonly isCurrent: boolean; readonly session: AuthActiveSession }): JSX.Element => {
  const t = useTranslations("pages.admin")
  const format = useFormatter()

  const queryClient = useQueryClient()
  const errorMessage = useErrorMessage()

  const revokeSession = useMutation({
    ...revokeSessionMutation,
    onError: (error) => {
      toast.error(errorMessage(error))
    },
    onSuccess: () => {
      toast.success(t("settings.security.sessions.feedback.revokeSuccess"))
      return queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEYS.ALL })
    },
  })

  const isMobile = session.userAgent !== null && MOBILE_USER_AGENT_PATTERN.test(session.userAgent)
  const lastActive = t("settings.security.sessions.activeAgo", { time: format.relativeTime(session.updatedAt, new Date()) })
  const activity = isCurrent ? session.ipAddress : lastActive

  return (
    <div className="group flex items-center justify-between gap-4 p-5 transition-colors hover:bg-muted/40">
      <div className="flex items-center gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground shadow-inner">
          {isMobile && <Smartphone className="size-5" />}
          {!isMobile && <Laptop className="size-5" />}
        </div>
        <div>
          <div className="mb-0.5 flex items-center gap-2">
            <p className="text-sm font-medium text-foreground">{deviceLabel(session) ?? t("settings.security.sessions.unknownDevice")}</p>
            {isCurrent && (
              <Badge className="px-0 text-xs font-medium text-ring" variant="outline">
                {t("settings.security.sessions.currentBadge")}
              </Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {t("labels.unknownLocation")}
            {t("settings.security.sessions.separator")} {activity}
          </p>
        </div>
      </div>
      {!isCurrent && (
        <Button
          aria-label={t("settings.security.sessions.revoke")}
          className="h-8 px-3 text-xs font-medium text-destructive transition-opacity hover:bg-destructive/10 hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100"
          isDisabled={revokeSession.isPending}
          onPress={() => {
            revokeSession.mutate({ sessionId: session.id })
          }}
          size="sm"
          variant="ghost"
        >
          {revokeSession.isPending && <Loader2 aria-hidden className="size-4 animate-spin" />}
          {!revokeSession.isPending && t("settings.security.sessions.revoke")}
        </Button>
      )}
    </div>
  )
}
