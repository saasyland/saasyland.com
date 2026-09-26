import type { JSX, ReactNode } from "react"

import { Link, createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { redirectIfSignedIn } from "~/src/integrations/better-auth/auth.routes"
import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { pageHead } from "~/src/lib/seo"

import { AUTH_LINK_TAGS } from "~/src/presentation/components/custom/auth/auth-link-tags"
import { SignUpPending } from "~/src/presentation/components/custom/auth/auth-pending"
import { OAuthButtons } from "~/src/presentation/components/custom/auth/oauth-buttons"
import { SignUpForm } from "~/src/presentation/components/custom/auth/sign-up-form"

import { APP_NAME } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

const LEGAL_LINK_CLASS = "text-foreground underline underline-offset-4 transition-colors duration-200 ease-exp hover:text-muted-foreground"

const LEGAL_TAGS = {
  privacy: (chunks: ReactNode) => (
    <Link className={LEGAL_LINK_CLASS} to={ROUTES.PRIVACY}>
      {chunks}
    </Link>
  ),
  terms: (chunks: ReactNode) => (
    <Link className={LEGAL_LINK_CLASS} to={ROUTES.TERMS}>
      {chunks}
    </Link>
  ),
}

const SignUpPage = (): JSX.Element => {
  const t = useTranslations("pages.auth.sign-up")

  return (
    <>
      <h1 className="text-headline-support text-balance text-foreground">{t("form.title")}</h1>
      <p className="mt-3 text-body text-pretty text-muted-foreground">{t("form.description", { name: APP_NAME })}</p>

      <div className="mt-10 flex flex-col gap-6">
        <OAuthButtons intent="sign-up" />
        <div className="flex items-center gap-4">
          <span aria-hidden className="h-px flex-1 bg-border" />
          <span className="text-body-sm text-muted-foreground">{t("form.or")}</span>
          <span aria-hidden className="h-px flex-1 bg-border" />
        </div>
        <SignUpForm />
        <p className="text-body-sm text-pretty text-muted-foreground">{t.rich("form.termsAndPrivacy", LEGAL_TAGS)}</p>
      </div>

      <p className="mt-10 text-body-sm text-muted-foreground">{t.rich("form.hasAccount", AUTH_LINK_TAGS)}</p>
    </>
  )
}

const NAMESPACE = "pages.auth.sign-up"

export const Route = createFileRoute("/auth/sign-up")({
  validateSearch: (search: Record<string, unknown>): { tier?: string | undefined } => ({
    tier: typeof search["tier"] === "string" ? search["tier"] : undefined,
  }),
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
