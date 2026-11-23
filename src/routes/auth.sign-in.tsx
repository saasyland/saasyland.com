import type { JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { AUTH_ERRORS, authErrorKeyFromSearch } from "~/src/integrations/better-auth/auth.errors"
import { redirectIfSignedIn } from "~/src/integrations/better-auth/auth.routes"
import { authSearchSchema } from "~/src/integrations/better-auth/auth.zod"
import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { deLocalizePathname } from "~/src/integrations/use-intl/i18n.paths"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { useNavigationLabel } from "~/src/hooks/use-navigation-label"

import { ADMIN_NAVIGATION, APP_NAVIGATION } from "~/src/data/navigation"

import { searchText } from "~/src/lib/search-params"
import { pageHead } from "~/src/lib/seo"

import { AUTH_LINK_TAGS } from "~/src/presentation/components/custom/auth/auth-link-tags"
import { SignInPending } from "~/src/presentation/components/custom/auth/auth-pending"
import { OAuthButtons, OAuthDivider } from "~/src/presentation/components/custom/auth/oauth-buttons"
import { SignInForm } from "~/src/presentation/components/custom/auth/sign-in-form"

import { ROUTES } from "~/src/routes"

const SIGNED_IN_PAGES = [...APP_NAVIGATION, ...ADMIN_NAVIGATION.flatMap(({ items }) => items)]

const QUERY_OR_HASH = /[?#]/u

const SessionEnded = ({ redirect }: { readonly redirect: string | undefined }): JSX.Element => {
  const t = useTranslations("pages.auth.sign-in")
  const navigationLabel = useNavigationLabel()

  const pathname = deLocalizePathname(redirect?.split(QUERY_OR_HASH)[0] ?? "")
  const page = SIGNED_IN_PAGES.find(({ to }) => to === pathname)

  return (
    <p className="rounded-lg border border-border bg-card px-4 py-3 text-body-sm text-pretty text-foreground" role="status">
      {page === undefined ? t("sessionEnded") : t("sessionEndedTo", { page: navigationLabel(page) })}
    </p>
  )
}

const SignInPage = (): JSX.Element => {
  const t = useTranslations()
  const { error, redirect } = Route.useSearch()
  const errorKey = authErrorKeyFromSearch(error)

  return (
    <>
      <h1 className="text-headline-support text-balance text-foreground">{t("pages.auth.sign-in.form.title")}</h1>
      <p className="mt-3 text-body text-pretty text-muted-foreground">{t("pages.auth.sign-in.form.description")}</p>

      <div className="mt-10 flex flex-col gap-6">
        {errorKey === AUTH_ERRORS.SESSION_EXPIRED && <SessionEnded redirect={redirect} />}
        {errorKey !== undefined && errorKey !== AUTH_ERRORS.SESSION_EXPIRED && (
          <p className="text-body text-pretty text-destructive" role="alert">
            {t(`auth.errors.${errorKey}`)}
          </p>
        )}
        <OAuthButtons />
        <OAuthDivider />
        <SignInForm />
      </div>

      <p className="mt-10 text-body-sm text-muted-foreground">{t.rich("pages.auth.sign-in.form.noAccount", AUTH_LINK_TAGS)}</p>
    </>
  )
}

const NAMESPACE = "pages.auth.sign-in"

export const Route = createFileRoute("/auth/sign-in")({
  validateSearch: authSearchSchema.extend({
    email: searchText(),
    error: searchText(),
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
