import type { JSX } from "react"

import { Link, createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { cn } from "~/src/lib/cn"
import { pageHead } from "~/src/lib/seo"

import { buttonVariants } from "~/src/presentation/components/shadcn/button"

import { ResetPasswordPending } from "~/src/presentation/components/custom/auth/auth-pending"
import { ResetPasswordForm } from "~/src/presentation/components/custom/auth/reset-password-form"

import { ROUTES } from "~/src/routes"

const ResetPasswordPage = (): JSX.Element => {
  const t = useTranslations("pages.auth.reset-password")
  const { error, token } = Route.useSearch()
  const hasValidLink = error === "" && token !== ""

  return (
    <>
      <h1 className="text-headline-support text-balance text-foreground">{t("form.title")}</h1>
      <p className="mt-3 text-body text-pretty text-muted-foreground">{t("form.description")}</p>

      <div className="mt-10 flex flex-col gap-6">
        {hasValidLink && <ResetPasswordForm />}
        {!hasValidLink && (
          <>
            <p className="text-body text-pretty text-destructive">{t("form.invalidToken")}</p>
            <Link
              className={cn(buttonVariants(), "h-12 w-full gap-2 text-body-sm font-semibold transition-[background-color,color,transform]")}
              to={ROUTES.FORGOT_PASSWORD}
            >
              {t("form.requestNewLink")}
            </Link>
          </>
        )}
      </div>
    </>
  )
}

const NAMESPACE = "pages.auth.reset-password"

export const Route = createFileRoute("/auth/reset-password")({
  validateSearch: (search: Record<string, unknown>) => ({
    error: typeof search["error"] === "string" ? search["error"] : "",
    token: typeof search["token"] === "string" ? search["token"] : "",
  }),
  component: ResetPasswordPage,
  head: pageHead(ROUTES.RESET_PASSWORD),
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
    ])
    return { locale, metadata }
  },
  pendingComponent: ResetPasswordPending,
  staticData: { namespaces: [NAMESPACE] },
})
