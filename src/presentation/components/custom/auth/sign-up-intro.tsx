import type { JSX } from "react"

import { getRouteApi, useRouterState } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { authSearchSchema } from "~/src/integrations/better-auth/auth.zod"

import { redirectTierSchema } from "~/src/data/license"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import { SignUpOrderSummary, SignUpOrderSummaryPending } from "~/src/presentation/components/custom/app/sign-up-order-summary"

interface IntroOption {
  readonly appliesTo: (redirect: string | undefined) => boolean
  readonly Intro: (props: Readonly<{ redirect: string | undefined }>) => JSX.Element
  readonly Pending: () => JSX.Element
}

const INTROS: readonly IntroOption[] = [
  {
    Intro: SignUpOrderSummary,
    Pending: SignUpOrderSummaryPending,
    appliesTo: (redirect) => redirectTierSchema.safeParse(redirect).success,
  },
]

const route = getRouteApi("/auth/sign-up")

const introFor = (redirect: string | undefined): IntroOption | undefined => INTROS.find(({ appliesTo }) => appliesTo(redirect))

export const SignUpIntro = (): JSX.Element => {
  const t = useTranslations("pages.auth.sign-up")

  const { redirect } = route.useSearch()

  const intro = introFor(redirect)

  if (intro === undefined) {
    return <p className="mt-3 text-body text-pretty text-muted-foreground">{t("form.description")}</p>
  }

  return <intro.Intro redirect={redirect} />
}

export const SignUpIntroPending = (): JSX.Element => {
  const redirect = useRouterState({ select: ({ location }) => authSearchSchema.parse(location.search).redirect })

  const intro = introFor(redirect)

  if (intro === undefined) {
    return <Skeleton className="mt-3 h-lh w-4/5 scale-y-70 text-body" />
  }

  return <intro.Pending />
}
