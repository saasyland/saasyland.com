import type { JSX } from "react"

import { type SearchSchemaInput, createFileRoute, redirect } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { localizePathname } from "~/src/integrations/use-intl/i18n.paths"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { cn } from "~/src/lib/cn"
import { pageHead } from "~/src/lib/seo"

import { VerifyEmailPending } from "~/src/presentation/components/custom/auth/auth-pending"
import { VerifyEmailForm } from "~/src/presentation/components/custom/auth/verify-email-form"

import { ROUTES } from "~/src/routes"

const VerifyEmailPage = (): JSX.Element => {
  const t = useTranslations("pages.auth.verify-email")
  const isInvalidLink = Route.useSearch({ select: (search) => search.error !== "" })

  return (
    <>
      <h1 className="text-headline-support text-balance text-foreground">{t("form.title")}</h1>
      <p className="mt-3 text-body text-pretty text-muted-foreground">{t("form.description")}</p>

      <div className="mt-10 flex flex-col gap-6">
        <p className={cn("text-body text-pretty", { "text-destructive": isInvalidLink, "text-muted-foreground": !isInvalidLink })}>
          {t(isInvalidLink ? "form.invalidToken" : "form.pendingDescription")}
        </p>
        <VerifyEmailForm />
      </div>
    </>
  )
}

const NAMESPACE = "pages.auth.verify-email"

export const Route = createFileRoute("/auth/verify-email")({
  validateSearch: (search: Record<string, unknown> & SearchSchemaInput) => ({
    email: typeof search["email"] === "string" ? search["email"] : "",
    error: typeof search["error"] === "string" ? search["error"] : "",
    token: typeof search["token"] === "string" ? search["token"] : "",
    verified: search["verified"] === true || search["verified"] === "true",
  }),
  beforeLoad: ({ preload, search }) => {
    if (preload) {
      return
    }
    if (search.token) {
      const callbackURL = localizePathname({ locale: getCurrentLocale(), pathname: `${ROUTES.VERIFY_EMAIL}?verified=true` })
      const query = new URLSearchParams({ callbackURL, token: search.token })
      throw redirect({ href: `${ROUTES.API_AUTH_VERIFY_EMAIL}?${query}`, reloadDocument: true, replace: true })
    }
    if (search.verified && !search.error) {
      throw redirect({ replace: true, to: ROUTES.AUTH_CALLBACK })
    }
  },
  component: VerifyEmailPage,
  head: pageHead(ROUTES.VERIFY_EMAIL),
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
    ])
    return { locale, metadata }
  },
  pendingComponent: VerifyEmailPending,
  staticData: { namespaces: [NAMESPACE] },
})
