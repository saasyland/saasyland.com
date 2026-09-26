import type { JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { pageHead } from "~/src/lib/seo"

import { AUTH_LINK_TAGS } from "~/src/presentation/components/custom/auth/auth-link-tags"
import { ForgotPasswordPending } from "~/src/presentation/components/custom/auth/auth-pending"
import { ForgotPasswordForm } from "~/src/presentation/components/custom/auth/forgot-password-form"

import { ROUTES } from "~/src/routes"

const ForgotPasswordPage = (): JSX.Element => {
  const t = useTranslations("pages.auth.forgot-password")

  return (
    <>
      <h1 className="text-headline-support text-balance text-foreground">{t("form.title")}</h1>
      <p className="mt-3 text-body text-pretty text-muted-foreground">{t("form.description")}</p>

      <div className="mt-10 flex flex-col gap-6">
        <ForgotPasswordForm />
      </div>

      <p className="mt-10 text-body-sm text-muted-foreground">{t.rich("form.rememberPassword", AUTH_LINK_TAGS)}</p>
    </>
  )
}

const NAMESPACE = "pages.auth.forgot-password"

export const Route = createFileRoute("/auth/forgot-password")({
  component: ForgotPasswordPage,
  head: pageHead(ROUTES.FORGOT_PASSWORD),
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
    ])
    return { locale, metadata }
  },
  pendingComponent: ForgotPasswordPending,
  staticData: { namespaces: [NAMESPACE] },
})
