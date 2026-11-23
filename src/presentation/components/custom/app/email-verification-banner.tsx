import { type JSX, useEffect, useId, useState } from "react"

import { useQueryClient } from "@tanstack/react-query"
import { CircleCheck, MailWarning } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { EMAIL_LINK_LIFETIME_HOURS } from "~/src/integrations/better-auth/auth.constants"
import { refreshUserData } from "~/src/integrations/better-auth/auth.session"

import { sendVerificationEmailMutation } from "~/src/modules/verification/use-cases/send-verification-email"

import { useAuthRedirect } from "~/src/hooks/use-auth-redirect"
import { useEmailLinkResend } from "~/src/hooks/use-email-link-resend"
import { useEmailVerification } from "~/src/hooks/use-email-verification"

import { Button } from "~/src/presentation/components/shadcn/button"

import { ADDRESS_TAGS } from "~/src/presentation/components/custom/address-tags"
import { ChangeEmailForm } from "~/src/presentation/components/custom/auth/change-email-form"
import { ResendLinkButton, ResendLinkStatus } from "~/src/presentation/components/custom/auth/email-link-resend"

import { ROUTES } from "~/src/routes"

const PendingConfirmation = ({ email }: { readonly email: string }): JSX.Element => {
  const t = useTranslations("components.custom.email-verification-banner")
  const headingId = useId()
  const [isChanging, setChanging] = useState(false)

  const { hrefWithRedirect } = useAuthRedirect()
  const resend = useEmailLinkResend(sendVerificationEmailMutation)

  return (
    <section
      aria-labelledby={headingId}
      className="mb-6 flex flex-col gap-4 rounded-lg border border-ring/40 bg-ring/5 p-5 md:mb-8 md:flex-row md:p-6"
    >
      <span
        aria-hidden
        className="flex size-10 shrink-0 items-center justify-center rounded-full border border-ring/40 bg-ring/10 text-ring"
      >
        <MailWarning className="size-4" strokeWidth={2} />
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <h2 className="text-title text-balance text-foreground" id={headingId}>
            {t("title")}
          </h2>
          <p className="max-w-[68ch] text-body-sm text-pretty text-muted-foreground">
            {t.rich("body", { ...ADDRESS_TAGS, email, hours: EMAIL_LINK_LIFETIME_HOURS })}
          </p>
        </div>
        {isChanging && (
          <ChangeEmailForm
            onDone={() => {
              setChanging(false)
            }}
          />
        )}
        {!isChanging && (
          <form
            className="flex flex-col gap-3"
            noValidate
            onSubmit={(event) => {
              event.preventDefault()
              resend.send({ callbackURL: hrefWithRedirect(ROUTES.AUTH_CALLBACK), email })
            }}
          >
            <div className="flex flex-wrap items-center gap-3">
              <ResendLinkButton cooldownSeconds={resend.cooldownSeconds} isPending={resend.isPending}>
                {t("resend")}
              </ResendLinkButton>
              <Button
                className="h-11 px-4 text-body-sm"
                onPress={() => {
                  setChanging(true)
                }}
                variant="ghost"
              >
                {t("change")}
              </Button>
            </div>
            <ResendLinkStatus accountKnown outcome={resend.outcome} />
          </form>
        )}
      </div>
    </section>
  )
}

export const EmailVerificationBanner = (): JSX.Element | undefined => {
  const t = useTranslations("components.custom.email-verification-banner")
  const queryClient = useQueryClient()

  const { confirmed, unconfirmedEmail } = useEmailVerification()
  const [awaitedConfirmation] = useState(unconfirmedEmail !== undefined)

  const confirmedHere = awaitedConfirmation && confirmed

  useEffect(() => {
    if (confirmedHere) {
      void refreshUserData(queryClient)
    }
  }, [confirmedHere, queryClient])

  if (unconfirmedEmail !== undefined) {
    return <PendingConfirmation email={unconfirmedEmail} />
  }

  if (!confirmedHere) {
    return
  }

  return (
    <p
      className="mb-6 flex items-center gap-3 rounded-lg border border-border bg-card px-5 py-4 text-body-sm text-foreground md:mb-8"
      role="status"
    >
      <CircleCheck aria-hidden className="size-4 shrink-0 text-ring" strokeWidth={2.25} />
      {t("confirmed")}
    </p>
  )
}
