import type { JSX, ReactNode } from "react"

import { Loader2 } from "lucide-react"
import { useFormatter, useTranslations } from "use-intl/react"

import { RECIPIENT_EMAILS_PER_HOUR } from "~/src/modules/rate-limit/rate-limit.constants"

import type { ResendOutcome } from "~/src/hooks/use-email-link-resend"

import { cn } from "~/src/lib/cn"
import { MILLISECONDS_PER_SECOND, formatClock } from "~/src/lib/duration"

import { Button } from "~/src/presentation/components/shadcn/button"

interface ResendLinkButtonProps {
  readonly children: ReactNode
  readonly className?: string
  readonly cooldownSeconds: number
  readonly isPending: boolean
  readonly variant?: "default" | "outline"
}

export const ResendLinkButton = ({
  children,
  className,
  cooldownSeconds,
  isPending,
  variant = "default",
}: ResendLinkButtonProps): JSX.Element => (
  <Button
    className={cn("h-11 gap-2 px-5 text-body-sm font-semibold transition-[background-color,color,transform]", className)}
    data-testid="email-link-resend-button"
    isDisabled={cooldownSeconds > 0}
    isPending={isPending}
    type="submit"
    variant={variant}
  >
    {isPending && <Loader2 aria-hidden className="size-4 animate-spin" strokeWidth={1.5} />}
    {children}
    {cooldownSeconds > 0 && (
      <span aria-hidden className="text-spec tabular-nums opacity-80">
        {formatClock(cooldownSeconds * MILLISECONDS_PER_SECOND)}
      </span>
    )}
  </Button>
)

interface ResendLinkStatusProps {
  readonly accountKnown: boolean
  readonly outcome: ResendOutcome | undefined
}

export const ResendLinkStatus = ({ accountKnown, outcome }: ResendLinkStatusProps): JSX.Element => {
  const t = useTranslations("components.custom.email-link-resend")
  const format = useFormatter()

  return (
    <p
      className={cn("text-body-sm text-pretty", {
        "text-destructive": outcome?.sent === false,
        "text-muted-foreground": outcome?.sent !== false,
      })}
      role="status"
    >
      {outcome?.sent === true && t(accountKnown ? "sent" : "sentIfAccount", { email: outcome.email })}
      {outcome?.sent === false &&
        t("limit", { count: RECIPIENT_EMAILS_PER_HOUR, time: format.dateTime(outcome.retryAt, { hour: "numeric", minute: "2-digit" }) })}
    </p>
  )
}
