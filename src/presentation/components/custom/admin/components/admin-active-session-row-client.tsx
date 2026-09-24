import { type JSX } from "react"

import { Laptop, Loader2, Smartphone } from "lucide-react"
import { useFormatter, useTranslations } from "use-intl/react"

import type { AuthActiveSession } from "~/src/integrations/better-auth/auth.types"

import { Badge } from "~/src/presentation/components/shadcn/badge"
import { Button } from "~/src/presentation/components/shadcn/button"

const MOBILE_USER_AGENT_PATTERN = /mobile|iphone|android|ipad|ipod/iu

interface AdminActiveSessionRowClientProps {
  readonly currentSessionId: string | undefined
  readonly isPending: boolean
  readonly onRevoke: (token: string) => void
  readonly session: AuthActiveSession
}

export const AdminActiveSessionRowClient = ({
  currentSessionId,
  isPending,
  onRevoke,
  session,
}: AdminActiveSessionRowClientProps): JSX.Element => {
  const format = useFormatter()
  const tCommon = useTranslations("pages.admin")

  const t = useTranslations("pages.admin.settings")

  const isCurrent = currentSessionId !== undefined && session.id === currentSessionId
  const isMobile = session.userAgent !== undefined && session.userAgent !== null && MOBILE_USER_AGENT_PATTERN.test(session.userAgent)

  let deviceLabel = t("security.sessions.unknownDevice")
  if (session.userAgent !== undefined && session.userAgent !== null && session.userAgent.length > 0) {
    deviceLabel = session.userAgent
  } else if (session.ipAddress !== undefined && session.ipAddress !== null && session.ipAddress.length > 0) {
    deviceLabel = session.ipAddress
  }

  const handleRevoke = () => {
    onRevoke(session.token)
  }

  return (
    <div className="group flex items-center justify-between gap-4 p-5 transition-colors hover:bg-muted/40">
      <div className="flex items-center gap-4">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg border border-border bg-secondary text-muted-foreground shadow-inner">
          {isMobile ? <Smartphone className="size-5" /> : <Laptop className="size-5" />}
        </div>
        <div>
          <div className="mb-0.5 flex items-center gap-2">
            <p className="text-sm font-medium text-foreground">{deviceLabel}</p>
            {isCurrent ? (
              <Badge variant="outline" className="px-0 text-xs font-medium text-ring">
                {t("security.sessions.currentBadge")}
              </Badge>
            ) : undefined}
          </div>
          <p className="text-xs text-muted-foreground">
            {tCommon("labels.unknownLocation")}
            {t("security.sessions.separator")}{" "}
            {isCurrent ? session.ipAddress : t("security.sessions.activeAgo", { time: format.relativeTime(session.updatedAt, new Date()) })}
          </p>
        </div>
      </div>
      {isCurrent ? undefined : (
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-3 text-xs font-medium text-destructive transition-opacity hover:bg-destructive/10 hover:text-destructive sm:opacity-0 sm:group-hover:opacity-100"
          isDisabled={isPending}
          onPress={handleRevoke}
        >
          {isPending ? <Loader2 className="size-4 animate-spin" /> : t("security.sessions.revoke")}
        </Button>
      )}
    </div>
  )
}
