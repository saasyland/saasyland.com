import type { JSX } from "react"

import { Link, type SearchSchemaInput, createFileRoute, redirect } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { NEWSLETTER_TOKEN_LENGTH } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.constants"
import { unsubscribeFromNewsletter } from "~/src/modules/newsletter-subscriber/use-cases/unsubscribe-from-newsletter"

import { pageHead } from "~/src/lib/seo"

import { NewsletterPending } from "~/src/presentation/components/custom/marketing-pending"

import { ROUTES } from "~/src/routes"

const NewsletterUnsubscribePage = ({ status }: { readonly status: "error" | "success" }): JSX.Element => {
  const t = useTranslations("pages.newsletter.unsubscribe")

  return (
    <section className="relative">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-6 py-32 text-center md:py-40">
        <h1 className="text-headline-peak text-balance text-foreground">{t(`${status}.title`)}</h1>
        <p className="mt-5 text-lead text-pretty text-muted-foreground">{t(`${status}.body`)}</p>
        <p className="mt-8 text-body-sm text-pretty text-muted-foreground">{t("note")}</p>
        <Link
          className="mt-10 rounded-sm text-body-sm font-medium text-foreground underline underline-offset-4 transition-colors duration-200 ease-exp hover:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
          to={ROUTES.HOME}
        >
          {t("resubscribe")}
        </Link>
      </div>
    </section>
  )
}

const NAMESPACE = "pages.newsletter.unsubscribe"

export const Route = createFileRoute("/_landing/newsletter/unsubscribe")({
  validateSearch: (search: Record<string, unknown> & SearchSchemaInput) => ({
    status: search["status"] === "success" ? ("success" as const) : ("error" as const),
    token: typeof search["token"] === "string" ? search["token"] : undefined,
  }),
  loaderDeps: ({ search: { token } }) => ({ token: token ?? "" }),
  component: () => <NewsletterUnsubscribePage status={Route.useSearch().status} />,
  errorComponent: () => <NewsletterUnsubscribePage status="error" />,
  head: pageHead(ROUTES.NEWSLETTER_UNSUBSCRIBE),
  loader: async ({ context, deps: { token } }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
    ])
    if (token) {
      if (token.length !== NEWSLETTER_TOKEN_LENGTH) {
        throw redirect({ replace: true, search: { status: "error" }, to: ROUTES.NEWSLETTER_UNSUBSCRIBE })
      }
      await unsubscribeFromNewsletter({ data: { token } })
      throw redirect({ replace: true, search: { status: "success" }, to: ROUTES.NEWSLETTER_UNSUBSCRIBE })
    }
    return { locale, metadata }
  },
  pendingComponent: NewsletterPending,
  preload: false,
  staticData: { namespaces: [NAMESPACE] },
})
