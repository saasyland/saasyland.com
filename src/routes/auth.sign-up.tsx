import type { JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { redirectIfSignedIn } from "~/src/integrations/better-auth/auth.routes"
import { authSearchSchema } from "~/src/integrations/better-auth/auth.zod"
import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { pageHead } from "~/src/lib/seo"

import { AUTH_LINK_TAGS } from "~/src/presentation/components/custom/auth/auth-link-tags"
import { SignUpPending } from "~/src/presentation/components/custom/auth/auth-pending"
import { OAuthButtons, OAuthDivider } from "~/src/presentation/components/custom/auth/oauth-buttons"
import { SignUpForm } from "~/src/presentation/components/custom/auth/sign-up-form"
import { SignUpIntro } from "~/src/presentation/components/custom/auth/sign-up-intro"
import { SignUpConsent } from "~/src/presentation/components/custom/sign-up-consent"

import * as ROUTES from "~/src/routes"

const SignUpPage = (): JSX.Element => {
  const t = useTranslations("pages.auth.sign-up")

  return (
    <>
      <h1 className="text-headline-support text-balance text-foreground">{t("form.title")}</h1>
      <SignUpIntro />

      <div className="mt-10 flex flex-col gap-6">
        <OAuthButtons />
        <OAuthDivider />
        <SignUpForm />
        <SignUpConsent />
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
