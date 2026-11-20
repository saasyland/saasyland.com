import { type JSX, type ReactNode, useEffect } from "react"

import { useQueryClient } from "@tanstack/react-query"
import { Link, useRouter, useRouterState } from "@tanstack/react-router"
import { Lock, MailWarning } from "lucide-react"
import { useFormatter, useTranslations } from "use-intl/react"

import { refreshUserData } from "~/src/integrations/better-auth/auth.session"

import { CURRENCY_FORMAT } from "~/src/modules/_core/constants/pricing"
import type { Course } from "~/src/modules/course/course.types"
import { LESSON_ACCESS } from "~/src/modules/lesson/lesson.constants"
import { sendVerificationEmailMutation } from "~/src/modules/verification/use-cases/send-verification-email"

import { useAuthRedirect } from "~/src/hooks/use-auth-redirect"
import { useCourseAccessNames } from "~/src/hooks/use-course-access-names"
import { useEmailLinkResend } from "~/src/hooks/use-email-link-resend"
import { useEmailVerification } from "~/src/hooks/use-email-verification"

import { COURSE_ACCESS_GRANTS } from "~/src/data/course-access"
import { CTA_CLASSES } from "~/src/data/cta"

import { cn } from "~/src/lib/cn"

import { ResendLinkButton, ResendLinkStatus } from "~/src/presentation/components/custom/auth/email-link-resend"

import { ROUTES } from "~/src/routes"

const CTA_CLASSNAME = cn("mt-6", CTA_CLASSES.PRIMARY)
const SIGN_IN_CLASSNAME =
  "font-medium text-foreground underline underline-offset-4 transition-colors duration-200 ease-exp hover:text-muted-foreground"
const PANEL_CLASSNAME =
  "flex aspect-video w-full flex-col items-center justify-center rounded-lg border border-border bg-radial from-ring/10 to-card to-70% px-6 text-center max-sm:aspect-auto max-sm:py-10"

const ADDRESS_TAGS = { address: (chunks: ReactNode) => <strong className="font-medium wrap-break-word text-foreground">{chunks}</strong> }

interface UnlockLinkProps {
  readonly access: Course["pageLesson"]["access"]
  readonly signedIn: boolean
}

interface LockedLessonProps extends UnlockLinkProps {
  readonly mustConfirmEmail: boolean
}

const SignInInstead = ({ message }: { readonly message: string }): JSX.Element => {
  const t = useTranslations("pages.courses.lesson.locked")
  const redirect = useRouterState({ select: ({ location }) => location.publicHref })

  return (
    <p className="mt-4 text-body-sm text-muted-foreground">
      {t.rich(message, {
        link: (chunks) => (
          <Link className={SIGN_IN_CLASSNAME} search={{ redirect }} to={ROUTES.SIGN_IN}>
            {chunks}
          </Link>
        ),
      })}
    </p>
  )
}

export const UnlockLink = ({ access, signedIn }: UnlockLinkProps): JSX.Element | JSX.Element[] => {
  const tName = useTranslations()
  const t = useTranslations("pages.courses.lesson.locked")
  const router = useRouter()
  const redirect = useRouterState({ select: ({ location }) => location.publicHref })

  if (access === LESSON_ACCESS.ACCOUNT) {
    return (
      <>
        <Link className={CTA_CLASSNAME} search={{ redirect }} to={ROUTES.SIGN_UP}>
          {t("account.cta")}
        </Link>
        <SignInInstead message="account.signIn" />
      </>
    )
  }

  return COURSE_ACCESS_GRANTS.map(({ key, offer, unlock }) => {
    const purchase = unlock(redirect)

    if (signedIn) {
      return (
        <Link className={CTA_CLASSNAME} key={key} {...purchase}>
          {t("paid.cta", { offer: tName(offer) })}
        </Link>
      )
    }

    return (
      <div className="flex flex-col items-center" key={key}>
        <Link className={CTA_CLASSNAME} search={{ redirect: router.buildLocation(purchase).publicHref }} to={ROUTES.SIGN_UP}>
          {t("paid.cta", { offer: tName(offer) })}
        </Link>
        <p className="mt-4 text-body-sm text-muted-foreground">
          {t.rich("paid.signIn", {
            link: (chunks) => (
              <Link className={SIGN_IN_CLASSNAME} search={{ redirect }} to={ROUTES.SIGN_IN}>
                {chunks}
              </Link>
            ),
            offer: tName(offer),
          })}
        </p>
      </div>
    )
  })
}

const OfferPrices = (): JSX.Element[] => {
  const tName = useTranslations()
  const t = useTranslations("pages.courses.lesson.locked")
  const format = useFormatter()

  return COURSE_ACCESS_GRANTS.map(({ key, offer, price }) => (
    <p className="mt-4 font-mono text-spec text-ring uppercase" key={key}>
      {t("paid.price", { offer: tName(offer), price: format.number(price, CURRENCY_FORMAT) })}
    </p>
  ))
}

const ConfirmEmailToWatch = (): JSX.Element => {
  const t = useTranslations("pages.courses.lesson.locked.confirm")
  const queryClient = useQueryClient()
  const redirect = useRouterState({ select: ({ location }) => location.publicHref })

  const { confirmed, unconfirmedEmail } = useEmailVerification()
  const { hrefWithRedirect } = useAuthRedirect()
  const resend = useEmailLinkResend(sendVerificationEmailMutation)

  useEffect(() => {
    if (confirmed) {
      void refreshUserData(queryClient)
    }
  }, [confirmed, queryClient])

  return (
    <div className={PANEL_CLASSNAME}>
      <span aria-hidden className="flex size-11 items-center justify-center rounded-full border border-ring/40 bg-ring/10">
        <MailWarning className="size-4 text-ring" strokeWidth={2.25} />
      </span>
      <h2 className="mt-5 text-title text-balance text-foreground">{t("title")}</h2>
      <p className="mt-2 max-w-[46ch] text-body-sm text-pretty text-muted-foreground">
        {unconfirmedEmail === undefined && t("bodyWithoutEmail")}
        {unconfirmedEmail !== undefined && t.rich("body", { ...ADDRESS_TAGS, email: unconfirmedEmail })}
      </p>
      {unconfirmedEmail !== undefined && (
        <form
          className="mt-6 flex flex-col items-center gap-3"
          noValidate
          onSubmit={(event) => {
            event.preventDefault()
            resend.send({ callbackURL: hrefWithRedirect(ROUTES.AUTH_CALLBACK), email: unconfirmedEmail })
          }}
        >
          <ResendLinkButton cooldownSeconds={resend.cooldownSeconds} isPending={resend.isPending}>
            {t("resend")}
          </ResendLinkButton>
          <ResendLinkStatus accountKnown outcome={resend.outcome} />
        </form>
      )}
      <Link className={cn("mt-2 text-body-sm", SIGN_IN_CLASSNAME)} search={{ redirect }} to={ROUTES.VERIFY_EMAIL}>
        {t("change")}
      </Link>
    </div>
  )
}

export const LockedLesson = ({ access, mustConfirmEmail, signedIn }: LockedLessonProps): JSX.Element => {
  const t = useTranslations("pages.courses.lesson.locked")

  const { offer } = useCourseAccessNames()
  const reason = access === LESSON_ACCESS.ACCOUNT ? LESSON_ACCESS.ACCOUNT : LESSON_ACCESS.PAID

  if (reason === LESSON_ACCESS.PAID && mustConfirmEmail) {
    return <ConfirmEmailToWatch />
  }

  return (
    <div className={PANEL_CLASSNAME}>
      <span aria-hidden className="flex size-11 items-center justify-center rounded-full border border-ring/40 bg-ring/10">
        <Lock className="size-4 text-ring" strokeWidth={2.25} />
      </span>
      <h2 className="mt-5 text-title text-balance text-foreground">{t(`${reason}.title`, { offer })}</h2>
      <p className="mt-2 max-w-[46ch] text-body-sm text-pretty text-muted-foreground">{t(`${reason}.body`, { offer })}</p>
      {reason === LESSON_ACCESS.PAID && <OfferPrices />}
      <UnlockLink access={access} signedIn={signedIn} />
    </div>
  )
}
