import type { JSX } from "react"

import { Link, type SearchSchemaInput, createFileRoute, redirect } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { NEWSLETTER_TOKEN_LENGTH } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.constants"
import { confirmNewsletterSubscription } from "~/src/modules/newsletter-subscriber/use-cases/confirm-newsletter-subscription"

import { pageHead } from "~/src/lib/seo"

import { NewsletterPending } from "~/src/presentation/components/custom/marketing-pending"

import { ROUTES } from "~/src/routes"

const NewsletterConfirmPage = ({ status }: { readonly status: "confirmed" | "error" | "expired" }): JSX.Element => {
  const t = useTranslations("pages.newsletter.confirm")

  return (
    <section className="relative">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-6 py-32 text-center md:py-40">
        <h1 className="text-headline-peak text-balance text-foreground">{t(`${status}.title`)}</h1>
        <p className="mt-5 text-lead text-pretty text-muted-foreground">{t(`${status}.body`)}</p>
        <p className="mt-8 text-body-sm text-pretty text-muted-foreground">{t(`${status}.note`)}</p>
        <Link
          className="mt-10 rounded-sm text-body-sm font-medium text-foreground underline underline-offset-4 transition-colors duration-200 ease-exp hover:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          to={ROUTES.HOME}
        >
          {t(`${status}.action`)}
        </Link>
      </div>
    </section>
  )
}

const NAMESPACE = "pages.newsletter.confirm"

export const Route = createFileRoute("/_landing/newsletter/confirm")({
  validateSearch: (search: Record<string, unknown> & SearchSchemaInput) => ({
    status: search["status"] === "confirmed" ? ("confirmed" as const) : ("expired" as const),
    token: typeof search["token"] === "string" ? search["token"] : undefined,
  }),
  loaderDeps: ({ search: { token } }) => ({ token: token ?? "" }),
  component: () => <NewsletterConfirmPage status={Route.useSearch().status} />,
  errorComponent: () => <NewsletterConfirmPage status="error" />,
  head: pageHead(ROUTES.NEWSLETTER_CONFIRM),
  loader: async ({ context, deps: { token } }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
    ])
    if (token) {
      const result = token.length === NEWSLETTER_TOKEN_LENGTH ? await confirmNewsletterSubscription({ data: { token } }) : undefined
      throw redirect({
        replace: true,
        search: { status: result?.confirmed === true ? "confirmed" : "expired" },
        to: ROUTES.NEWSLETTER_CONFIRM,
      })
    }
    return { locale, metadata }
  },
  pendingComponent: NewsletterPending,
  preload: false,
  staticData: { namespaces: [NAMESPACE] },
})
