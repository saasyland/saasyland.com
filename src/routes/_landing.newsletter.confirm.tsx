import type { JSX } from "react"

import { useMutation } from "@tanstack/react-query"
import { Link, createFileRoute } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"
import * as zod from "zod"

import { loadPageMetadata, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { CONFIRMATION_STATUS } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.constants"
import { newsletterSubscriberZodSchemas } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.zod"
import { confirmNewsletterSubscriptionMutation } from "~/src/modules/newsletter-subscriber/use-cases/confirm-newsletter-subscription"

import { useErrorMessage } from "~/src/hooks/use-error-message"

import { searchChoice, searchParam } from "~/src/lib/search-params"
import { pageHead } from "~/src/lib/seo"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Spinner } from "~/src/presentation/components/shadcn/spinner"

import { NewsletterPending } from "~/src/presentation/components/custom/marketing-pending"

import { ROUTES } from "~/src/routes"

type ConfirmationStatus = (typeof CONFIRMATION_STATUS)[keyof typeof CONFIRMATION_STATUS]

const NAMESPACE = "pages.newsletter.confirm"
const LOAD_ERROR = "error"

const NewsletterConfirmResult = ({ status }: { readonly status: ConfirmationStatus | typeof LOAD_ERROR }): JSX.Element => {
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
    <section className="relative">
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center px-6 py-32 text-center md:py-40">
        <h1 className="text-headline-peak text-balance text-foreground">{t("prompt.title")}</h1>
        <p className="mt-5 text-lead text-pretty text-muted-foreground">{t("prompt.body")}</p>
        <Button
          className="mt-10 h-12 gap-2 px-6 text-body-sm font-semibold"
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
      </div>
    </section>
  )
}

const NewsletterConfirmPage = (): JSX.Element => {
  const { status, token } = Route.useSearch()

  if (token !== undefined) {
    return <NewsletterConfirmPrompt token={token} />
  }

  return <NewsletterConfirmResult status={status} />
}

export const Route = createFileRoute("/_landing/newsletter/confirm")({
  validateSearch: zod.object({
    status: searchChoice([CONFIRMATION_STATUS.CONFIRMED, CONFIRMATION_STATUS.EXPIRED], CONFIRMATION_STATUS.EXPIRED),
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
  staticData: { namespaces: [NAMESPACE] },
})
