import type { JSX } from "react"

import { useMutation } from "@tanstack/react-query"
import { Link, createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"
import * as zod from "zod"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { UNSUBSCRIBE_STATUS } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.constants"
import { newsletterSubscriberZodSchemas } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.zod"
import { unsubscribeFromNewsletterMutation } from "~/src/modules/newsletter-subscriber/use-cases/unsubscribe-from-newsletter"

import { useErrorMessage } from "~/src/hooks/use-error-message"

import { searchChoice, searchParam } from "~/src/lib/search-params"
import { pageHead } from "~/src/lib/seo"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Spinner } from "~/src/presentation/components/shadcn/spinner"

import { NewsletterPending } from "~/src/presentation/components/custom/marketing-pending"

import { ROUTES } from "~/src/routes"

type UnsubscribeStatus = (typeof UNSUBSCRIBE_STATUS)[keyof typeof UNSUBSCRIBE_STATUS]

const NAMESPACE = "pages.newsletter.unsubscribe"

const NewsletterUnsubscribeResult = ({ status }: { readonly status: UnsubscribeStatus }): JSX.Element => {
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

const NewsletterUnsubscribePrompt = ({ token }: { readonly token: string }): JSX.Element => {
  const t = useTranslations("pages.newsletter.unsubscribe")
  const errorMessage = useErrorMessage()
  const navigate = Route.useNavigate()
  const unsubscribe = useMutation({
    ...unsubscribeFromNewsletterMutation,
    onSuccess: async () => {
      await navigate({ replace: true, search: { status: UNSUBSCRIBE_STATUS.SUCCESS } })
    },
  })

  return (
    <section className="relative">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-6 py-32 text-center md:py-40">
        <h1 className="text-headline-peak text-balance text-foreground">{t("prompt.title")}</h1>
        <p className="mt-5 text-lead text-pretty text-muted-foreground">{t("prompt.body")}</p>
        <Button
          className="mt-10 h-12 gap-2 px-6 text-body-sm font-semibold"
          isPending={unsubscribe.isPending}
          onPress={() => {
            unsubscribe.mutate({ token })
          }}
        >
          {unsubscribe.isPending && <Spinner />}
          {t("prompt.action")}
        </Button>
        <p className="mt-4 min-h-5 text-body-sm text-pretty text-destructive" role="alert">
          {unsubscribe.isError && errorMessage(unsubscribe.error)}
        </p>
      </div>
    </section>
  )
}

const NewsletterUnsubscribePage = (): JSX.Element => {
  const { status, token } = Route.useSearch()

  if (token !== undefined) {
    return <NewsletterUnsubscribePrompt token={token} />
  }

  return <NewsletterUnsubscribeResult status={status} />
}

export const Route = createFileRoute("/_landing/newsletter/unsubscribe")({
  validateSearch: zod.object({
    status: searchChoice([UNSUBSCRIBE_STATUS.ERROR, UNSUBSCRIBE_STATUS.SUCCESS], UNSUBSCRIBE_STATUS.ERROR),
    token: searchParam(newsletterSubscriberZodSchemas.unsubscribeFromNewsletter.shape.token),
  }),
  component: NewsletterUnsubscribePage,
  errorComponent: () => <NewsletterUnsubscribeResult status={UNSUBSCRIBE_STATUS.ERROR} />,
  head: pageHead(ROUTES.NEWSLETTER_UNSUBSCRIBE),
  loader: async ({ context }) => {
    const locale = getCurrentLocale()
    const [metadata] = await Promise.all([
      loadPageMetadata({ locale, namespace: NAMESPACE }),
      preloadNamespaces({ locale, namespaces: [NAMESPACE], queryClient: context.queryClient }),
    ])
    return { locale, metadata }
  },
  pendingComponent: NewsletterPending,
  staticData: { namespaces: [NAMESPACE] },
})
