import type { JSX } from "react"

import { createFileRoute, redirect } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { authSearchSchema } from "~/src/integrations/better-auth/auth.zod"
import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { cn } from "~/src/lib/cn"
import { searchFlag, searchText } from "~/src/lib/search-params"
import { pageHead } from "~/src/lib/seo"

import { VerifyEmailPending } from "~/src/presentation/components/custom/auth/auth-pending"
import { VerifyEmailForm } from "~/src/presentation/components/custom/auth/verify-email-form"

import { ROUTES } from "~/src/routes"

const VerifyEmailPage = (): JSX.Element => {
  const t = useTranslations("pages.auth.verify-email")
  const isInvalidLink = Route.useSearch({ select: (search) => search.error !== undefined })

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
  validateSearch: authSearchSchema.extend({
    email: searchText(),
    error: searchText(),
    token: searchText(),
    verified: searchFlag(),
  }),
  beforeLoad: ({ buildLocation, preload, search }) => {
    if (preload) {
      return
    }
    if (search.token !== undefined) {
      const { publicHref: callbackURL } = buildLocation({ search: { redirect: search.redirect, verified: true }, to: ROUTES.VERIFY_EMAIL })
      const query = new URLSearchParams({ callbackURL, token: search.token })
      throw redirect({ href: `${ROUTES.API_AUTH_VERIFY_EMAIL}?${query}`, reloadDocument: true, replace: true })
    }
    if (search.verified === true && search.error === undefined) {
      throw redirect({ replace: true, search: { redirect: search.redirect }, to: ROUTES.AUTH_CALLBACK })
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
