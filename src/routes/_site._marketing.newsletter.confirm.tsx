import type { JSX } from "react"

import { useMutation } from "@tanstack/react-query"
import { Link, createFileRoute, stripSearchParams } from "@tanstack/react-router"
import { Button } from "react-aria-components"
import { useTranslations } from "use-intl/react"
import * as zod from "zod"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { CONFIRMATION_STATUS, CONFIRMATION_WINDOW_IN_HOURS } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.constants"
import { newsletterSubscriberZodSchemas } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.zod"
import { confirmNewsletterSubscriptionMutation } from "~/src/modules/newsletter-subscriber/use-cases/confirm-newsletter-subscription"

import { useErrorMessage } from "~/src/hooks/use-error-message"

import { CTA_CLASSES } from "~/src/data/cta"
import { NEWSLETTER_SENDING } from "~/src/data/newsletter"

import { cn } from "~/src/lib/cn"
import { searchChoice, searchParam } from "~/src/lib/search-params"
import { pageHead } from "~/src/lib/seo"

import { Spinner } from "~/src/presentation/components/shadcn/spinner"

import { BackHomeLink } from "~/src/presentation/components/custom/back-home-link"
import { ContentPage } from "~/src/presentation/components/custom/content-page"
import { NewsletterPending } from "~/src/presentation/components/custom/newsletter-pending"

import * as ROUTES from "~/src/routes"

type ConfirmationStatus = (typeof CONFIRMATION_STATUS)[keyof typeof CONFIRMATION_STATUS]

const LOAD_ERROR = "error"

const NewsletterConfirmResult = ({ status }: { readonly status: ConfirmationStatus | typeof LOAD_ERROR }): JSX.Element => {
  const t = useTranslations("pages.newsletter.confirm")

  return (
    <ContentPage
      lead={t(`${status}.body`, { hours: CONFIRMATION_WINDOW_IN_HOURS, sending: NEWSLETTER_SENDING })}
      title={t(`${status}.title`)}
    >
      <p className="mt-6 max-w-2xl text-body-sm text-pretty text-muted-foreground">{t(`${status}.note`)}</p>
      <div className="mt-10">
        {status === CONFIRMATION_STATUS.CONFIRMED && (
          <Link className={CTA_CLASSES.PRIMARY} to={ROUTES.HOME}>
            {t("confirmed.action")}
          </Link>
        )}
        {status !== CONFIRMATION_STATUS.CONFIRMED && <BackHomeLink />}
      </div>
    </ContentPage>
  )
}

const NewsletterConfirmPrompt = ({ token }: { readonly token: string }): JSX.Element => {
  const t = useTranslations("pages.newsletter.confirm")
  const errorMessage = useErrorMessage()
  const navigate = Route.useNavigate()
  const confirm = useMutation({
    ...confirmNewsletterSubscriptionMutation,
    onSuccess: async ({ confirmed }) => {
      await navigate({ replace: true, search: { status: confirmed ? CONFIRMATION_STATUS.CONFIRMED : CONFIRMATION_STATUS.EXPIRED } })
    },
  })

  return (
    <ContentPage lead={t("prompt.body", { sending: NEWSLETTER_SENDING })} title={t("prompt.title")}>
      <Button
        className={cn("mt-10", CTA_CLASSES.PRIMARY)}
        isPending={confirm.isPending}
        onPress={() => {
          confirm.mutate({ token })
        }}
      >
        {confirm.isPending && <Spinner />}
        {t("prompt.action")}
      </Button>
      <p className="mt-4 min-h-5 text-body-sm text-pretty text-destructive" role="alert">
        {confirm.isError && errorMessage(confirm.error)}
      </p>
    </ContentPage>
  )
}

const NewsletterConfirmPage = (): JSX.Element => {
  const { status, token } = Route.useSearch()

  if (token !== undefined) {
    return <NewsletterConfirmPrompt token={token} />
  }

  return <NewsletterConfirmResult status={status} />
}

const NAMESPACE = "pages.newsletter.confirm"

const SEARCH_DEFAULTS = { status: CONFIRMATION_STATUS.EXPIRED } as const

export const Route = createFileRoute("/_site/_marketing/newsletter/confirm")({
  validateSearch: zod.object({
    status: searchChoice([CONFIRMATION_STATUS.CONFIRMED, CONFIRMATION_STATUS.EXPIRED], SEARCH_DEFAULTS.status),
    token: searchParam(newsletterSubscriberZodSchemas.confirmNewsletterSubscription.shape.token),
  }),
  component: NewsletterConfirmPage,
  errorComponent: () => <NewsletterConfirmResult status={LOAD_ERROR} />,
  head: pageHead(ROUTES.NEWSLETTER_CONFIRM),
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
