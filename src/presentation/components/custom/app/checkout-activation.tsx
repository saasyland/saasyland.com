import { type JSX, type ReactNode, useState } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { CircleCheck, Clock } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { LICENSE_STATUS } from "~/src/modules/license/license.constants"
import type { License } from "~/src/modules/license/license.types"
import { currentLicenseQuery } from "~/src/modules/license/use-cases/get-current-license"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Spinner } from "~/src/presentation/components/shadcn/spinner"

import { CONTACT_EMAIL } from "~/src/presentation/branding"

export const ACTIVATION_POLL_MS = 2000

export const ACTIVATION_TIMEOUT_MS = 60_000

const EMAIL_TAGS = {
  email: CONTACT_EMAIL,
  mail: (chunks: ReactNode) => (
    <a
      className="font-medium text-foreground underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      href={`mailto:${CONTACT_EMAIL}`}
    >
      {chunks}
    </a>
  ),
}

const isActive = (license: License["select"] | undefined): license is License["select"] => license?.status === LICENSE_STATUS.ACTIVE

const hasTimedOut = (dataUpdatedAt: number, startedAt: number): boolean => dataUpdatedAt - startedAt >= ACTIVATION_TIMEOUT_MS

const ActivationPanel = ({ children, icon }: Readonly<{ children: ReactNode; icon: ReactNode }>): JSX.Element => (
  <section className="flex items-start gap-5 rounded-xl border border-border bg-card p-6 md:p-8" role="status">
    <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full border border-ring/40 bg-ring/10 text-ring">
      {icon}
    </span>
    <div className="flex min-w-0 flex-col items-start gap-2">{children}</div>
  </section>
)

export const CheckoutActivation = ({ checkoutId }: Readonly<{ checkoutId: string }>): JSX.Element => {
  const tTier = useTranslations("components.custom.pricing")
  const t = useTranslations("pages.license.activation")

  const [startedAt] = useState(Date.now)

  const { data, dataUpdatedAt, isRefetching, refetch } = useSuspenseQuery({
    ...currentLicenseQuery,
    refetchInterval: ({ state }) =>
      isActive(state.data?.license) || hasTimedOut(state.dataUpdatedAt, startedAt) ? false : ACTIVATION_POLL_MS,
  })

  if (isActive(data.license)) {
    return (
      <ActivationPanel icon={<CircleCheck className="size-4.5" strokeWidth={2.25} />}>
        <h2 className="text-title text-balance text-foreground">{t("active.title")}</h2>
        <p className="max-w-[60ch] text-body-sm text-pretty text-muted-foreground">
          {t("active.body", { tier: tTier(`tiers.${data.license.tier}.name`) })}
        </p>
      </ActivationPanel>
    )
  }

  if (hasTimedOut(dataUpdatedAt, startedAt)) {
    return (
      <ActivationPanel icon={<Clock className="size-4.5" strokeWidth={2.25} />}>
        <h2 className="text-title text-balance text-foreground">{t("delayed.title")}</h2>
        <p className="max-w-[60ch] text-body-sm text-pretty text-muted-foreground">{t.rich("delayed.body", EMAIL_TAGS)}</p>
        <p className="text-body-sm text-muted-foreground">
          {t("delayed.reference")} <code className="font-mono text-spec break-all text-foreground select-all">{checkoutId}</code>
        </p>
        <Button
          className="mt-3"
          isDisabled={isRefetching}
          onPress={() => {
            void refetch()
          }}
          size="lg"
          variant="outline"
        >
          {isRefetching && <Spinner />}
          {t("delayed.retry")}
        </Button>
      </ActivationPanel>
    )
  }

  return (
    <ActivationPanel icon={<Spinner className="size-4.5" />}>
      <h2 className="text-title text-balance text-foreground">{t("activating.title")}</h2>
      <p className="max-w-[60ch] text-body-sm text-pretty text-muted-foreground">{t("activating.body")}</p>
    </ActivationPanel>
  )
}
