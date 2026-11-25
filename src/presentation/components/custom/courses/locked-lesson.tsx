import { type JSX, type ReactNode, useEffect } from "react"

import { useQueryClient } from "@tanstack/react-query"
import { Link, useRouter, useRouterState } from "@tanstack/react-router"
import { Lock, MailWarning } from "lucide-react"
import { useFormatter, useTranslations } from "use-intl/react"

import { refreshUserData } from "~/src/integrations/better-auth/auth.session"

import { CURRENCY_FORMAT } from "~/src/modules/_core/constants/pricing"
import type { Course } from "~/src/modules/course/course.types"
import { COURSE_ACCESS_GRANTS } from "~/src/modules/lesson/lesson.access"
import { LESSON_ACCESS } from "~/src/modules/lesson/lesson.constants"
import { sendVerificationEmailMutation } from "~/src/modules/verification/use-cases/send-verification-email"

import { useAuthRedirect } from "~/src/hooks/use-auth-redirect"
import { useCourseAccessNames } from "~/src/hooks/use-course-access-names"
import { useEmailLinkResend } from "~/src/hooks/use-email-link-resend"
import { useEmailVerification } from "~/src/hooks/use-email-verification"

import { CTA_CLASSES } from "~/src/data/cta"

import { cn } from "~/src/lib/cn"

import { ADDRESS_TAGS } from "~/src/presentation/components/custom/address-tags"
import { ResendLinkButton, ResendLinkStatus } from "~/src/presentation/components/custom/auth/email-link-resend"

import * as ROUTES from "~/src/routes"

const SIGN_IN_CLASSNAME =
  "font-medium text-foreground underline underline-offset-4 transition-colors duration-200 ease-exp hover:text-muted-foreground"
const SIGN_IN_LINE_CLASSNAME = "text-body-sm text-muted-foreground"
const PANEL_CLASSNAME = "flex flex-col items-center px-6 text-center"
const BADGE_CLASSNAME = "flex size-11 items-center justify-center rounded-full border border-ring/40 bg-background/70 backdrop-blur-sm"

type Access = Course["pageLesson"]["access"]

interface UnlockLinkProps {
  readonly access: Access
  readonly signedIn: boolean
}

interface LockedLessonProps extends UnlockLinkProps {
  readonly mustConfirmEmail: boolean
}

const SignInLink = ({ children }: { readonly children: ReactNode }): JSX.Element => {
  const redirect = useRouterState({ select: ({ location }) => location.publicHref })

  return (
    <Link className={SIGN_IN_CLASSNAME} search={{ redirect }} to={ROUTES.SIGN_IN}>
      {children}
    </Link>
  )
}

const signInLink = (chunks: ReactNode): JSX.Element => <SignInLink>{chunks}</SignInLink>

export const SignInInstead = ({
  access,
  className,
}: {
  readonly access: Access
  readonly className?: string
}): JSX.Element | JSX.Element[] => {
  const t = useTranslations()

  if (access === LESSON_ACCESS.ACCOUNT) {
    return (
      <p className={cn(SIGN_IN_LINE_CLASSNAME, className)}>{t.rich("pages.courses.lesson.locked.account.signIn", { link: signInLink })}</p>
    )
  }

  return COURSE_ACCESS_GRANTS.map(({ key, offer }) => (
    <p className={cn(SIGN_IN_LINE_CLASSNAME, className)} key={key}>
      {t.rich("pages.courses.lesson.locked.paid.signIn", { link: signInLink, offer: t(offer) })}
    </p>
  ))
}

export const UnlockLink = ({ access, signedIn }: UnlockLinkProps): JSX.Element | JSX.Element[] => {
  const t = useTranslations()
  const router = useRouter()
  const redirect = useRouterState({ select: ({ location }) => location.publicHref })

  if (access === LESSON_ACCESS.ACCOUNT) {
    return (
      <Link className={CTA_CLASSES.PRIMARY} search={{ redirect }} to={ROUTES.SIGN_UP}>
        {t("pages.courses.lesson.locked.account.cta")}
      </Link>
    )
  }

  return COURSE_ACCESS_GRANTS.map(({ key, offer, unlock }) => {
    const purchase = unlock(redirect)
    const label = t("pages.courses.lesson.locked.paid.cta", { offer: t(offer) })

    if (signedIn) {
      return (
        <Link className={CTA_CLASSES.PRIMARY} key={key} {...purchase}>
          {label}
        </Link>
      )
    }

    return (
      <Link className={CTA_CLASSES.PRIMARY} key={key} search={{ redirect: router.buildLocation(purchase).publicHref }} to={ROUTES.SIGN_UP}>
        {label}
      </Link>
    )
  })
}

export const ConfirmEmailLink = (): JSX.Element => {
  const t = useTranslations("pages.courses.lesson.locked.confirm")
  const redirect = useRouterState({ select: ({ location }) => location.publicHref })

  return (
    <Link className={CTA_CLASSES.PRIMARY} search={{ redirect }} to={ROUTES.VERIFY_EMAIL}>
      <MailWarning aria-hidden className="size-3.5" strokeWidth={2.25} />
      {t("title")}
    </Link>
  )
}

const OfferPrices = (): JSX.Element[] => {
  const t = useTranslations()
  const format = useFormatter()

  return COURSE_ACCESS_GRANTS.map(({ key, offer, price }) => (
    <p className="mt-4 text-label text-ring uppercase" key={key}>
      {t("pages.courses.lesson.locked.paid.price", { offer: t(offer), price: format.number(price, CURRENCY_FORMAT) })}
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
      <span aria-hidden className={BADGE_CLASSNAME}>
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
      <span aria-hidden className={BADGE_CLASSNAME}>
        <Lock className="size-4 text-ring" strokeWidth={2.25} />
      </span>
      <h2 className="mt-5 text-title text-balance text-foreground">{t(`${reason}.title`, { offer })}</h2>
      <p className="mt-2 max-w-[46ch] text-body-sm text-pretty text-muted-foreground">{t(`${reason}.body`, { offer })}</p>
      {reason === LESSON_ACCESS.PAID && <OfferPrices />}
      <div className="mt-6 flex flex-wrap justify-center gap-3">
        <UnlockLink access={access} signedIn={signedIn} />
      </div>
      {!signedIn && <SignInInstead access={reason} className="mt-4" />}
    </div>
  )
}
