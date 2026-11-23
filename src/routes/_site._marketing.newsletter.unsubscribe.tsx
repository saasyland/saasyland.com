import type { JSX } from "react"

import { useMutation } from "@tanstack/react-query"
import { Link, createFileRoute, stripSearchParams } from "@tanstack/react-router"
import { Button } from "react-aria-components"
import { useTranslations } from "use-intl/react"
import * as zod from "zod"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { UNSUBSCRIBE_STATUS } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.constants"
import { newsletterSubscriberZodSchemas } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.zod"
import { unsubscribeFromNewsletterMutation } from "~/src/modules/newsletter-subscriber/use-cases/unsubscribe-from-newsletter"

import { useErrorMessage } from "~/src/hooks/use-error-message"

import { CTA_CLASSES } from "~/src/data/cta"

import { cn } from "~/src/lib/cn"
import { searchChoice, searchParam } from "~/src/lib/search-params"
import { pageHead } from "~/src/lib/seo"

import { Spinner } from "~/src/presentation/components/shadcn/spinner"

import { ContentPage } from "~/src/presentation/components/custom/content-page"
import { NewsletterPending } from "~/src/presentation/components/custom/newsletter-pending"

import * as ROUTES from "~/src/routes"

type UnsubscribeStatus = (typeof UNSUBSCRIBE_STATUS)[keyof typeof UNSUBSCRIBE_STATUS]

const NewsletterUnsubscribeResult = ({ status }: { readonly status: UnsubscribeStatus }): JSX.Element => {
  const t = useTranslations("pages.newsletter.unsubscribe")

  return (
    <ContentPage lead={t(`${status}.body`)} title={t(`${status}.title`)}>
      <p className="mt-6 max-w-2xl text-body-sm text-pretty text-muted-foreground">{t("note")}</p>
      <Link
        className="mt-10 inline-block rounded-sm text-body-sm font-medium text-foreground underline underline-offset-4 transition-colors duration-200 ease-exp hover:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
        to={ROUTES.HOME}
      >
        {t("resubscribe")}
      </Link>
    </ContentPage>
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
    <ContentPage lead={t("prompt.body")} title={t("prompt.title")}>
      <Button
        className={cn("mt-10", CTA_CLASSES.PRIMARY)}
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
    </ContentPage>
  )
}

const NewsletterUnsubscribePage = (): JSX.Element => {
  const { status, token } = Route.useSearch()

  if (token !== undefined) {
    return <NewsletterUnsubscribePrompt token={token} />
  }

  return <NewsletterUnsubscribeResult status={status} />
}

const NAMESPACE = "pages.newsletter.unsubscribe"

const SEARCH_DEFAULTS = { status: UNSUBSCRIBE_STATUS.ERROR } as const

export const Route = createFileRoute("/_site/_marketing/newsletter/unsubscribe")({
  validateSearch: zod.object({
    status: searchChoice([UNSUBSCRIBE_STATUS.ERROR, UNSUBSCRIBE_STATUS.SUCCESS], SEARCH_DEFAULTS.status),
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
  search: { middlewares: [stripSearchParams(SEARCH_DEFAULTS)] },
  staticData: { namespaces: [NAMESPACE] },
})
