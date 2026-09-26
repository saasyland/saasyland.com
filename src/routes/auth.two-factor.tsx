import type { JSX } from "react"

import { createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { pageHead } from "~/src/lib/seo"

import { TwoFactorPending } from "~/src/presentation/components/custom/auth/auth-pending"
import { TwoFactorForm } from "~/src/presentation/components/custom/auth/two-factor-form"

import { ROUTES } from "~/src/routes"

const TwoFactorPage = (): JSX.Element => {
  const t = useTranslations("pages.auth.two-factor")

  return (
    <>
      <h1 className="text-headline-support text-balance text-foreground">{t("form.title")}</h1>
      <p className="mt-3 text-body text-pretty text-muted-foreground">{t("form.description")}</p>

      <div className="mt-10 flex flex-col gap-6">
        <TwoFactorForm />
      </div>
    </>
  )
}

const NAMESPACE = "pages.auth.two-factor"

export const Route = createFileRoute("/auth/two-factor")({
  component: TwoFactorPage,
  head: pageHead(ROUTES.TWO_FACTOR),
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
    ])
    return { locale, metadata }
  },
  pendingComponent: TwoFactorPending,
  staticData: { namespaces: [NAMESPACE] },
})
