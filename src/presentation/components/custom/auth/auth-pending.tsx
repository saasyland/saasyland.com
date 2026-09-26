import type { JSX } from "react"

import { useRouterState } from "@tanstack/react-router"

import { TWO_FACTOR_CODE_LENGTH } from "~/src/integrations/better-auth/auth.constraints"
import { deLocalizePathname } from "~/src/integrations/use-intl/i18n.paths"

import { createOtpSlotIndices } from "~/src/modules/two-factor/two-factor.utils"

import { AUTH_ASSURANCES, OAUTH_PROVIDERS, PASSWORD_RULES } from "~/src/data/auth"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import { Wordmark } from "~/src/presentation/components/custom/wordmark"

import { ROUTES } from "~/src/routes"

const TitlePending = (): JSX.Element => <Skeleton className="h-lh w-3/5 scale-y-70 text-headline-support" />

const OAuthPending = (): JSX.Element => (
  <>
    <div className="flex flex-col gap-3">
      {OAUTH_PROVIDERS.map(({ id }) => (
        <Skeleton className="h-11 w-full rounded-lg" key={id} />
      ))}
    </div>
    <div className="flex items-center gap-4 text-body-sm">
      <span className="h-px flex-1 bg-border" />
      <Skeleton className="h-lh w-4 scale-y-70" />
      <span className="h-px flex-1 bg-border" />
    </div>
  </>
)

const FieldPending = (): JSX.Element => (
  <div className="flex flex-col gap-2">
    <Skeleton className="h-lh w-20 scale-y-70 text-body-sm" />
    <Skeleton className="h-11 w-full rounded-lg" />
  </div>
)

const PasswordRulesPending = (): JSX.Element => (
  <div className="flex flex-col gap-2 text-body-sm">
    {PASSWORD_RULES.map((rule) => (
      <div className="flex items-start gap-2.5" key={rule}>
        <Skeleton className="mt-0.5 size-4 shrink-0 rounded-xs" />
        <Skeleton className="h-lh w-52 scale-y-70" />
      </div>
    ))}
  </div>
)

const FooterPending = (): JSX.Element => <Skeleton className="mt-10 h-lh w-3/5 scale-y-70 text-body-sm" />

export const SignInPending = (): JSX.Element => (
  <div aria-busy="true" className="flex flex-col">
    <TitlePending />
    <Skeleton className="mt-3 h-lh w-4/5 scale-y-70 text-body" />
    <div className="mt-10 flex flex-col gap-6">
      <OAuthPending />
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-5">
          <FieldPending />
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between text-body-sm">
              <Skeleton className="h-lh w-20 scale-y-70" />
              <Skeleton className="h-lh w-28 scale-y-70" />
            </div>
            <Skeleton className="h-11 w-full rounded-lg" />
          </div>
        </div>
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
    </div>
    <FooterPending />
  </div>
)

export const SignUpPending = (): JSX.Element => (
  <div aria-busy="true" className="flex flex-col">
    <TitlePending />
    <Skeleton className="mt-3 h-lh w-4/5 scale-y-70 text-body" />
    <div className="mt-10 flex flex-col gap-6">
      <OAuthPending />
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-5">
          <FieldPending />
          <FieldPending />
          <FieldPending />
          <FieldPending />
        </div>
        <PasswordRulesPending />
        <Skeleton className="h-12 w-full rounded-lg" />
      </div>
      <div className="flex flex-col text-body-sm">
        <Skeleton className="h-lh w-full scale-y-70" />
        <Skeleton className="h-lh w-1/4 scale-y-70" />
      </div>
    </div>
    <FooterPending />
  </div>
)

export const ForgotPasswordPending = (): JSX.Element => (
  <div aria-busy="true" className="flex flex-col">
    <TitlePending />
    <div className="mt-3 flex flex-col text-body">
      <Skeleton className="h-lh w-full scale-y-70" />
      <Skeleton className="h-lh w-1/4 scale-y-70" />
    </div>
    <div className="mt-10 flex flex-col gap-6">
      <FieldPending />
      <Skeleton className="h-12 w-full rounded-lg" />
    </div>
    <FooterPending />
  </div>
)

export const ResetPasswordPending = (): JSX.Element => (
  <div aria-busy="true" className="flex flex-col">
    <TitlePending />
    <Skeleton className="mt-3 h-lh w-4/5 scale-y-70 text-body" />
    <div className="mt-10 flex flex-col gap-6">
      <div className="flex flex-col gap-5">
        <FieldPending />
        <FieldPending />
      </div>
      <PasswordRulesPending />
      <Skeleton className="h-12 w-full rounded-lg" />
    </div>
  </div>
)

export const TwoFactorPending = (): JSX.Element => (
  <div aria-busy="true" className="flex flex-col">
    <TitlePending />
    <div className="mt-3 flex flex-col text-body">
      <Skeleton className="h-lh w-full scale-y-70" />
      <Skeleton className="h-lh w-1/3 scale-y-70" />
    </div>
    <div className="mt-10 flex flex-col gap-6">
      <div className="flex flex-col gap-2">
        <Skeleton className="h-lh w-36 scale-y-70 text-body-sm" />
        <div className="flex w-fit overflow-hidden rounded-lg">
          {createOtpSlotIndices(TWO_FACTOR_CODE_LENGTH).map((index) => (
            <Skeleton className="size-12 rounded-none border-r border-background last:border-r-0" key={index} />
          ))}
        </div>
      </div>
      <Skeleton className="h-12 w-full rounded-lg" />
      <Skeleton className="h-11 w-full rounded-lg" />
    </div>
  </div>
)

export const VerifyEmailPending = (): JSX.Element => (
  <div aria-busy="true" className="flex flex-col">
    <TitlePending />
    <Skeleton className="mt-3 h-lh w-4/5 scale-y-70 text-body" />
    <div className="mt-10 flex flex-col gap-6">
      <div className="flex flex-col text-body">
        <Skeleton className="h-lh w-full scale-y-70" />
        <Skeleton className="h-lh w-1/2 scale-y-70" />
      </div>
      <div className="flex flex-col gap-3">
        <Skeleton className="h-12 w-full rounded-lg" />
        <FieldPending />
        <div className="flex h-11 items-center self-center text-body-sm">
          <Skeleton className="h-lh w-40 scale-y-70" />
        </div>
      </div>
    </div>
  </div>
)

const AUTH_PAGES = new Map<string, () => JSX.Element>([
  [ROUTES.FORGOT_PASSWORD, ForgotPasswordPending],
  [ROUTES.RESET_PASSWORD, ResetPasswordPending],
  [ROUTES.SIGN_IN, SignInPending],
  [ROUTES.SIGN_UP, SignUpPending],
  [ROUTES.TWO_FACTOR, TwoFactorPending],
  [ROUTES.VERIFY_EMAIL, VerifyEmailPending],
])

export const AuthPending = (): JSX.Element => {
  const pathname = useRouterState({ select: (state) => deLocalizePathname(state.location.pathname) })
  const Page = AUTH_PAGES.get(pathname)

  return (
    <div className="dark relative grid min-h-svh grid-cols-1 bg-background text-foreground antialiased lg:grid-cols-2">
      <div className="absolute inset-x-0 top-0 z-10 flex h-20 items-center justify-between gap-6 px-6 md:px-10">
        <div className="flex h-11 items-center">
          <Wordmark />
        </div>
        <div className="flex h-11 items-center gap-2 text-body-sm">
          <Skeleton className="size-4" />
          <Skeleton className="h-lh w-24 scale-y-70" />
        </div>
      </div>

      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-border bg-background p-12 lg:flex xl:p-16">
        <div className="field-grid pointer-events-none absolute inset-0" />
        <div className="relative flex max-w-md flex-col text-display-gate">
          <Skeleton className="h-lh w-2/3 scale-y-75" />
          <Skeleton className="h-lh w-7/10 scale-y-75" />
          <Skeleton className="h-lh w-3/4 scale-y-75" />
        </div>
        <div className="relative flex flex-col gap-5">
          {AUTH_ASSURANCES.map((assurance) => (
            <div className="flex items-start gap-3" key={assurance}>
              <span className="mt-2 size-1.25 shrink-0 rounded-xs bg-border" />
              <Skeleton className="h-lh w-64 scale-y-70 font-mono text-spec" />
            </div>
          ))}
        </div>
      </div>

      <div className="relative flex flex-col items-center justify-center px-6 py-28 md:px-10 lg:py-32">
        <div className="flex w-full max-w-105 flex-col">{Page && <Page />}</div>
      </div>
    </div>
  )
}
