import type { JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { authErrorKeyFromSearch } from "~/src/integrations/better-auth/auth.errors"
import { redirectIfSignedIn } from "~/src/integrations/better-auth/auth.routes"
import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { pageHead } from "~/src/lib/seo"

import { AUTH_LINK_TAGS } from "~/src/presentation/components/custom/auth/auth-link-tags"
import { SignInPending } from "~/src/presentation/components/custom/auth/auth-pending"
import { OAuthButtons } from "~/src/presentation/components/custom/auth/oauth-buttons"
import { SignInForm } from "~/src/presentation/components/custom/auth/sign-in-form"

import { APP_NAME } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

const SignInPage = (): JSX.Element => {
  const t = useTranslations()
  const errorKey = authErrorKeyFromSearch(Route.useSearch().error)

  return (
    <>
      <h1 className="text-headline-support text-balance text-foreground">{t("pages.auth.sign-in.form.title")}</h1>
      <p className="mt-3 text-body text-pretty text-muted-foreground">{t("pages.auth.sign-in.form.description", { name: APP_NAME })}</p>

      <div className="mt-10 flex flex-col gap-6">
        {errorKey !== undefined && (
          <p className="text-body text-pretty text-destructive" role="alert">
            {t(`auth.errors.${errorKey}`)}
          </p>
        )}
        <OAuthButtons />
        <div className="flex items-center gap-4">
          <span aria-hidden className="h-px flex-1 bg-border" />
          <span className="text-body-sm text-muted-foreground">{t("pages.auth.sign-in.form.or")}</span>
          <span aria-hidden className="h-px flex-1 bg-border" />
        </div>
        <SignInForm />
      </div>

      <p className="mt-10 text-body-sm text-muted-foreground">{t.rich("pages.auth.sign-in.form.noAccount", AUTH_LINK_TAGS)}</p>
    </>
  )
}

const NAMESPACE = "pages.auth.sign-in"

export const Route = createFileRoute("/auth/sign-in")({
  validateSearch: (search: Record<string, unknown>): { error?: string | undefined } => ({
    error: typeof search["error"] === "string" ? search["error"] : undefined,
  }),
  beforeLoad: redirectIfSignedIn,
  component: SignInPage,
  head: pageHead(ROUTES.SIGN_IN),
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
    ])
    return { locale, metadata }
  },
  pendingComponent: SignInPending,
  staticData: { namespaces: [NAMESPACE] },
})
