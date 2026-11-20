import { type JSX, type ReactNode, useEffect, useRef, useState } from "react"

import { useForm } from "@tanstack/react-form"
import { Link, getRouteApi } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { EMAIL_LINK_LIFETIME_HOURS } from "~/src/integrations/better-auth/auth.constants"
import { AUTH_VALIDATION_PARAMS } from "~/src/integrations/better-auth/auth.constraints"
import { emailSchema } from "~/src/integrations/better-auth/auth.zod"
import { fieldErrorMessage, isFieldInvalid, validateOnBlur } from "~/src/integrations/tanstack-form/form.fields"
import { submitForm } from "~/src/integrations/tanstack-form/form.submit"

import { sendVerificationEmailMutation } from "~/src/modules/verification/use-cases/send-verification-email"
import { verificationZodSchemas } from "~/src/modules/verification/verification.zod"

import { useAuthRedirect } from "~/src/hooks/use-auth-redirect"
import { useEmailLinkResend } from "~/src/hooks/use-email-link-resend"
import { useEmailVerification } from "~/src/hooks/use-email-verification"

import { cn } from "~/src/lib/cn"

import { Button, buttonVariants } from "~/src/presentation/components/shadcn/button"
import { Field, FieldLabel } from "~/src/presentation/components/shadcn/field"
import { Input } from "~/src/presentation/components/shadcn/input"

import { ChangeEmailForm } from "~/src/presentation/components/custom/auth/change-email-form"
import { ResendLinkButton, ResendLinkStatus } from "~/src/presentation/components/custom/auth/email-link-resend"
import { ValidationFieldError } from "~/src/presentation/components/custom/validation-field-error"

import { ROUTES } from "~/src/routes"

const routeApi = getRouteApi("/auth/verify-email")

const fieldSchema = verificationZodSchemas.sendVerificationEmail.pick({ email: true })

const PRIMARY_CLASS = "h-11 w-full gap-2 px-5 text-body-sm font-semibold transition-[background-color,color,transform]"
const SECONDARY_LINK_CLASS =
  "inline-flex h-11 items-center justify-center self-center text-body-sm text-muted-foreground underline-offset-4 transition-colors duration-200 ease-exp hover:text-foreground hover:underline"

const ADDRESS_TAGS = { address: (chunks: ReactNode) => <strong className="font-medium wrap-break-word text-foreground">{chunks}</strong> }

export const VERIFY_EMAIL_STATUS = {
  CONFIRMED: "confirmed",
  INVALID: "invalid",
  PENDING: "pending",
} as const

type VerifyEmailStatus = (typeof VERIFY_EMAIL_STATUS)[keyof typeof VERIFY_EMAIL_STATUS]

const statusOf = ({
  failed,
  signedIn,
  verified,
}: Readonly<{ failed: boolean; signedIn: boolean; verified: boolean }>): VerifyEmailStatus => {
  if (failed) {
    return VERIFY_EMAIL_STATUS.INVALID
  }
  if (verified && !signedIn) {
    return VERIFY_EMAIL_STATUS.CONFIRMED
  }
  return VERIFY_EMAIL_STATUS.PENDING
}

export const useVerifyEmailState = () => {
  const search = routeApi.useSearch()

  const { confirmed, unconfirmedEmail } = useEmailVerification()
  const signedIn = confirmed || unconfirmedEmail !== undefined
  const status = statusOf({ failed: search.error !== undefined, signedIn, verified: search.verified === true })

  return {
    address: unconfirmedEmail ?? emailSchema.safeParse(search.email?.trim()).data,
    confirmed,
    resentOnSignIn: status === VERIFY_EMAIL_STATUS.PENDING && search.unverified === true,
    signedIn,
    status,
    unconfirmedEmail,
  }
}

const VerifyEmailDescription = ({
  address,
  resentOnSignIn,
  status,
}: Readonly<{ address: string | undefined; resentOnSignIn: boolean; status: VerifyEmailStatus }>) => {
  const t = useTranslations("pages.auth.verify-email")
  const hours = EMAIL_LINK_LIFETIME_HOURS

  if (status === VERIFY_EMAIL_STATUS.CONFIRMED) {
    return <p className="mt-3 text-body text-pretty text-muted-foreground">{t("confirmed.description")}</p>
  }

  if (address === undefined) {
    return <p className="mt-3 text-body text-pretty text-muted-foreground">{t(`${status}.askEmail`, { hours })}</p>
  }

  if (resentOnSignIn) {
    return (
      <p className="mt-3 text-body text-pretty text-muted-foreground">
        {t.rich("pending.unverified", { ...ADDRESS_TAGS, email: address, hours })}
      </p>
    )
  }

  return (
    <p className="mt-3 text-body text-pretty text-muted-foreground">
      {t.rich(`${status}.description`, { ...ADDRESS_TAGS, email: address, hours })}
    </p>
  )
}

export const VerifyEmailHeading = (): JSX.Element => {
  const t = useTranslations("pages.auth.verify-email")
  const { address, resentOnSignIn, status } = useVerifyEmailState()

  return (
    <>
      <h1 className="text-headline-support text-balance text-foreground">{t(`${status}.title`)}</h1>
      <VerifyEmailDescription address={address} resentOnSignIn={resentOnSignIn} status={status} />
    </>
  )
}

export const VerifyEmailForm = (): JSX.Element => {
  const t = useTranslations("pages.auth.verify-email")
  const [isChanging, setChanging] = useState(false)
  const continued = useRef(false)

  const { address, confirmed, signedIn, status, unconfirmedEmail } = useVerifyEmailState()
  const { finishSignIn, hrefWithRedirect, redirect } = useAuthRedirect()
  const resend = useEmailLinkResend(sendVerificationEmailMutation)

  const asksForEmail = !signedIn && (address === undefined || isChanging)

  useEffect(() => {
    if (confirmed && !continued.current) {
      continued.current = true
      void finishSignIn()
    }
  }, [confirmed, finishSignIn])

  const form = useForm({
    defaultValues: { email: address ?? "" },
    listeners: { onBlur: validateOnBlur },
    onSubmit: ({ value }) => {
      resend.send({ callbackURL: hrefWithRedirect(ROUTES.AUTH_CALLBACK), email: unconfirmedEmail ?? value.email })
    },
    validators: { onChange: fieldSchema },
  })

  if (status === VERIFY_EMAIL_STATUS.CONFIRMED) {
    return (
      <div className="mt-10 flex flex-col gap-6">
        <Link className={cn(buttonVariants(), PRIMARY_CLASS)} search={{ email: address, redirect }} to={ROUTES.SIGN_IN}>
          {t("confirmed.signIn")}
        </Link>
      </div>
    )
  }

  return (
    <div className="mt-10 flex flex-col gap-3">
      {signedIn && isChanging && (
        <ChangeEmailForm
          onDone={() => {
            setChanging(false)
          }}
        />
      )}
      {!(signedIn && isChanging) && (
        <form
          className="flex flex-col gap-3"
          noValidate
          onSubmit={(event) => {
            void submitForm(event, form)
          }}
        >
          {asksForEmail && (
            <form.Field name="email">
              {(field) => {
                const isInvalid = isFieldInvalid(field)

                return (
                  <Field data-invalid={isInvalid}>
                    <FieldLabel className="text-body-sm text-foreground" htmlFor="verify-email-email">
                      {t("form.email")}
                    </FieldLabel>
                    <Input
                      aria-describedby="verify-email-email-error"
                      aria-invalid={isInvalid}
                      autoComplete="email"
                      className="h-11 px-3 text-foreground transition-[border-color,box-shadow] duration-200 ease-exp"
                      id="verify-email-email"
                      name={field.name}
                      onBlur={field.handleBlur}
                      onChange={(event) => {
                        field.handleChange(event.target.value)
                      }}
                      placeholder={t("form.emailPlaceholder")}
                      type="email"
                      value={field.state.value}
                    />
                    {isInvalid && (
                      <ValidationFieldError
                        id="verify-email-email-error"
                        message={fieldErrorMessage(field.state.meta.errors)}
                        namespace="auth.validations"
                        params={AUTH_VALIDATION_PARAMS}
                      />
                    )}
                  </Field>
                )
              }}
            </form.Field>
          )}
          <ResendLinkButton className="w-full" cooldownSeconds={resend.cooldownSeconds} isPending={resend.isPending}>
            {t(`${status}.send`)}
          </ResendLinkButton>
          <ResendLinkStatus accountKnown={signedIn} outcome={resend.outcome} />
        </form>
      )}
      {!isChanging && address !== undefined && (
        <Button
          className="h-11 px-5 text-body-sm"
          onPress={() => {
            form.setFieldValue("email", "", { dontUpdateMeta: true, dontValidate: true })
            setChanging(true)
          }}
          variant="ghost"
        >
          {t("form.useDifferentEmail")}
        </Button>
      )}
      {!signedIn && (
        <Link className={SECONDARY_LINK_CLASS} search={{ email: address, redirect }} to={ROUTES.SIGN_IN}>
          {t("form.backToSignIn")}
        </Link>
      )}
    </div>
  )
}
