import { type JSX, type ReactNode, useEffect, useState } from "react"

import { useSuspenseQuery } from "@tanstack/react-query"
import { ArrowRight, CircleCheck, Clock } from "lucide-react"
import { useTranslations } from "use-intl/react"

import type { LicenseTier } from "~/src/modules/license/license.constants"
import { hasReachedTier } from "~/src/modules/license/license.upgrades"
import { currentLicenseQuery } from "~/src/modules/license/use-cases/get-current-license"

import { useAuthRedirect } from "~/src/hooks/use-auth-redirect"

import { cn } from "~/src/lib/cn"
import { triggerConfetti } from "~/src/lib/confetti"

import { Button, buttonVariants } from "~/src/presentation/components/shadcn/button"
import { Spinner } from "~/src/presentation/components/shadcn/spinner"

import { GetStarted } from "~/src/presentation/components/custom/app/get-started"

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

const ActivationPanel = ({ children, icon }: Readonly<{ children: ReactNode; icon: ReactNode }>): JSX.Element => (
  <section className="flex items-start gap-5 rounded-lg border border-border bg-card p-6 md:p-8" role="status">
    <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full border border-ring/40 bg-ring/10 text-ring">
      {icon}
    </span>
    <div className="flex min-w-0 flex-col items-start gap-2">{children}</div>
  </section>
)

interface CheckoutActivationProps {
  readonly checkoutId: string
  readonly tier: LicenseTier | undefined
}

export const CheckoutActivation = ({ checkoutId, tier }: CheckoutActivationProps): JSX.Element => {
  const t = useTranslations()

  const [hasTimedOut, setHasTimedOut] = useState(false)

  const { redirect } = useAuthRedirect()

  useEffect(() => {
    const timeoutId = globalThis.setTimeout(() => {
      setHasTimedOut(true)
    }, ACTIVATION_TIMEOUT_MS)
    return () => {
      globalThis.clearTimeout(timeoutId)
    }
  }, [])

  const { data, isRefetching, refetch } = useSuspenseQuery({
    ...currentLicenseQuery,
    refetchInterval: ({ state }) => (hasReachedTier(state.data?.license, tier) || hasTimedOut ? false : ACTIVATION_POLL_MS),
  })

  const hasActivated = hasReachedTier(data.license, tier)

  useEffect(() => {
    if (hasActivated) {
      triggerConfetti()
    }
  }, [hasActivated])

  if (hasReachedTier(data.license, tier)) {
    return (
      <div className="flex flex-col gap-6">
        <ActivationPanel icon={<CircleCheck className="size-4.5" strokeWidth={2.25} />}>
          <h2 className="text-title text-balance text-foreground">{t("pages.license.activation.active.title")}</h2>
          <p className="max-w-[60ch] text-body-sm text-pretty text-muted-foreground">
            {t("pages.license.activation.active.body", { tier: t(`components.custom.pricing.tiers.${data.license.tier}.name`) })}
          </p>
          {redirect !== undefined && (
            <a className={cn(buttonVariants({ size: "lg" }), "mt-3 gap-2")} href={redirect}>
              {t("pages.license.activation.active.continue")}
              <ArrowRight aria-hidden className="size-4" />
            </a>
          )}
        </ActivationPanel>
        <GetStarted />
      </div>
    )
  }

  if (hasTimedOut) {
    return (
      <ActivationPanel icon={<Clock className="size-4.5" strokeWidth={2.25} />}>
        <h2 className="text-title text-balance text-foreground">{t("pages.license.activation.delayed.title")}</h2>
        <p className="max-w-[60ch] text-body-sm text-pretty text-muted-foreground">
          {t.rich("pages.license.activation.delayed.body", EMAIL_TAGS)}
        </p>
        <p className="text-body-sm text-muted-foreground">
          {t("pages.license.activation.delayed.reference")}{" "}
          <code className="font-mono text-spec break-all text-foreground select-all">{checkoutId}</code>
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
          {t("pages.license.activation.delayed.retry")}
        </Button>
      </ActivationPanel>
    )
  }

  return (
    <ActivationPanel icon={<Spinner className="size-4.5" />}>
      <h2 className="text-title text-balance text-foreground">{t("pages.license.activation.activating.title")}</h2>
      <p className="max-w-[60ch] text-body-sm text-pretty text-muted-foreground">{t("pages.license.activation.activating.body")}</p>
    </ActivationPanel>
  )
}
