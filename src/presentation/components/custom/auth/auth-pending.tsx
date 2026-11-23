import type { JSX } from "react"

import { useRouterState } from "@tanstack/react-router"

import { TWO_FACTOR_CODE_LENGTH } from "~/src/integrations/better-auth/auth.constraints"
import { authSearchSchema } from "~/src/integrations/better-auth/auth.zod"

import { createOtpSlotIndices } from "~/src/modules/two-factor/two-factor.utils"

import { usePagePending } from "~/src/hooks/use-page-pending"

import { AUTH_ASSURANCES, OAUTH_PROVIDERS } from "~/src/data/auth"
import { findSignUpIntro } from "~/src/data/sign-up-intros"
import { SIGN_UP_NOTICES } from "~/src/data/sign-up-notices"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import { Wordmark } from "~/src/presentation/components/custom/wordmark"

const TitlePending = (): JSX.Element => <Skeleton className="h-lh w-3/5 scale-y-70 text-headline-support" />

const OAuthPending = (): JSX.Element => (
  <>
    <div className="flex flex-col gap-3">
      {OAUTH_PROVIDERS.map(({ id }) => (
        <Skeleton className="h-11 w-full rounded-md" key={id} />
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
    <Skeleton className="h-11 w-full rounded-md" />
  </div>
)

const PasswordRulesPending = (): JSX.Element => (
  <div className="flex flex-col gap-2 text-body-sm">
    <div className="flex items-start gap-2.5">
      <Skeleton className="mt-0.5 size-4 shrink-0 rounded-sm" />
      <Skeleton className="h-lh w-52 scale-y-70" />
    </div>
    <Skeleton className="h-lh w-4/5 scale-y-70" />
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
            <Skeleton className="h-11 w-full rounded-md" />
          </div>
        </div>
        <Skeleton className="h-11 w-full rounded-md" />
      </div>
    </div>
    <FooterPending />
  </div>
)

const SignUpIntroPending = (): JSX.Element => {
  const redirect = useRouterState({ select: ({ location }) => authSearchSchema.parse(location.search).redirect })

  const intro = findSignUpIntro(redirect)

  if (intro === undefined) {
    return <Skeleton className="mt-3 h-lh w-4/5 scale-y-70 text-body" />
  }

  return <intro.Pending />
}

export const SignUpPending = (): JSX.Element => (
  <div aria-busy="true" className="flex flex-col">
    <TitlePending />
    <SignUpIntroPending />
    <div className="mt-10 flex flex-col gap-6">
      <OAuthPending />
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-5">
          <FieldPending />
          <FieldPending />
          <FieldPending />
        </div>
        <PasswordRulesPending />
        <Skeleton className="h-11 w-full rounded-md" />
      </div>
      {SIGN_UP_NOTICES.map(({ Pending, key }) => (
        <Pending key={key} />
      ))}
    </div>
    <FooterPending />
  </div>
)

export const AcceptInvitationPending = (): JSX.Element => (
  <div aria-busy="true" className="flex flex-col">
    <TitlePending />
    <div className="mt-3 flex flex-col text-body">
      <Skeleton className="h-lh w-full scale-y-70" />
      <Skeleton className="h-lh w-1/2 scale-y-70" />
    </div>
    <div className="mt-10 flex flex-col gap-6">
      <OAuthPending />
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-5">
          <FieldPending />
          <FieldPending />
          <FieldPending />
        </div>
        <PasswordRulesPending />
        <Skeleton className="h-11 w-full rounded-md" />
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
      <Skeleton className="h-11 w-full rounded-md" />
    </div>
    <FooterPending />
  </div>
)

export const ResetPasswordPending = (): JSX.Element => (
  <div aria-busy="true" className="flex flex-col">
    <TitlePending />
    <Skeleton className="mt-3 h-lh w-4/5 scale-y-70 text-body" />
    <div className="mt-10 flex flex-col gap-6">
      <FieldPending />
      <PasswordRulesPending />
      <Skeleton className="h-11 w-full rounded-md" />
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
        <div className="flex w-fit overflow-hidden rounded-md">
          {createOtpSlotIndices(TWO_FACTOR_CODE_LENGTH).map((index) => (
            <Skeleton className="size-12 rounded-none border-r border-background last:border-r-0" key={index} />
          ))}
        </div>
      </div>
      <Skeleton className="h-11 w-full rounded-md" />
      <Skeleton className="h-11 w-full rounded-md" />
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
        <Skeleton className="h-11 w-full rounded-md" />
        <FieldPending />
        <div className="flex h-11 items-center self-center text-body-sm">
          <Skeleton className="h-lh w-40 scale-y-70" />
        </div>
      </div>
    </div>
  </div>
)

export const AuthPending = (): JSX.Element => {
  const Page = usePagePending("/auth")

  return (
    <div className="dark grid min-h-svh grid-cols-[minmax(0,var(--form-width))] grid-rows-[auto_1fr] justify-center bg-background px-(--gutter) text-foreground [--form-width:--spacing(105)] [--gutter:--spacing(6)] md:[--gutter:--spacing(10)] lg:grid-cols-2 lg:px-0">
      <div className="relative z-10 col-span-full row-start-1 flex h-header items-center justify-between gap-6 lg:grid lg:grid-cols-subgrid lg:px-(--gutter)">
        <div className="flex h-11 items-center justify-self-start">
          <Wordmark />
        </div>
        <div className="flex h-11 items-center gap-2 justify-self-end text-body-sm">
          <Skeleton className="size-4" />
          <Skeleton className="h-lh w-24 scale-y-70" />
        </div>
      </div>

      <div className="relative hidden overflow-hidden border-r border-border px-(--gutter) lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:grid lg:grid-rows-subgrid">
        <div className="field-grid pointer-events-none absolute inset-0" />
        <div className="relative row-start-2 flex flex-col justify-between gap-12 py-12">
          <div className="flex max-w-md flex-col text-display-gate">
            <Skeleton className="h-lh w-2/3 scale-y-75" />
            <Skeleton className="h-lh w-7/10 scale-y-75" />
            <Skeleton className="h-lh w-3/4 scale-y-75" />
          </div>
          <div className="flex flex-col gap-5">
            {AUTH_ASSURANCES.map((assurance) => (
              <div className="flex items-start gap-3" key={assurance}>
                <span className="mt-2 size-1.25 shrink-0 rounded-full bg-border" />
                <Skeleton className="h-lh w-64 scale-y-70 text-spec" />
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="row-start-2 flex flex-col items-center py-12 lg:col-start-2 lg:px-(--gutter)">
        <div className="flex w-full max-w-(--form-width) flex-col">{Page && <Page />}</div>
      </div>
    </div>
  )
}
