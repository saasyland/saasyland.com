import type { JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { redirectIfSignedIn } from "~/src/integrations/better-auth/auth.routes"
import { authSearchSchema } from "~/src/integrations/better-auth/auth.zod"
import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { findSignUpIntro } from "~/src/data/sign-up-intros"
import { SIGN_UP_NOTICES } from "~/src/data/sign-up-notices"

import { pageHead } from "~/src/lib/seo"

import { AUTH_LINK_TAGS } from "~/src/presentation/components/custom/auth/auth-link-tags"
import { SignUpPending } from "~/src/presentation/components/custom/auth/auth-pending"
import { OAuthButtons, OAuthDivider } from "~/src/presentation/components/custom/auth/oauth-buttons"
import { SignUpForm } from "~/src/presentation/components/custom/auth/sign-up-form"

import { ROUTES } from "~/src/routes"

const SignUpPage = (): JSX.Element => {
  const t = useTranslations("pages.auth.sign-up")

  const { redirect } = Route.useSearch()

  const intro = findSignUpIntro(redirect)

  return (
    <>
      <h1 className="text-headline-support text-balance text-foreground">{t("form.title")}</h1>
      {intro === undefined && <p className="mt-3 text-body text-pretty text-muted-foreground">{t("form.description")}</p>}
      {intro !== undefined && <intro.Intro redirect={redirect} />}

      <div className="mt-10 flex flex-col gap-6">
        <OAuthButtons />
        <OAuthDivider />
        <SignUpForm />
        {SIGN_UP_NOTICES.map(({ Notice, key }) => (
          <Notice key={key} />
        ))}
      </div>

      <p className="mt-10 text-body-sm text-muted-foreground">{t.rich("form.hasAccount", AUTH_LINK_TAGS)}</p>
    </>
  )
}

const NAMESPACE = "pages.auth.sign-up"

export const Route = createFileRoute("/auth/sign-up")({
  validateSearch: authSearchSchema,
  beforeLoad: redirectIfSignedIn,
  component: SignUpPage,
  head: pageHead(ROUTES.SIGN_UP),
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
    ])
    return { locale, metadata }
  },
  pendingComponent: SignUpPending,
  staticData: { namespaces: [NAMESPACE] },
})
