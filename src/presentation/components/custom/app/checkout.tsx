import { type JSX, type ReactNode, Suspense, lazy, useState } from "react"

import { useIsMutating } from "@tanstack/react-query"
import { useTranslations } from "use-intl/react"

import { LICENSE_MUTATION_KEYS, type LicenseTier } from "~/src/modules/license/license.constants"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Dialog, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "~/src/presentation/components/shadcn/dialog"
import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

const CheckoutConsent = lazy(() =>
  import("~/src/presentation/components/custom/app/checkout-consent").then((module) => ({ default: module.CheckoutConsent })),
)

const CheckoutConsentPending = (): JSX.Element => (
  <div className="flex flex-col gap-4">
    <Skeleton className="h-28 w-full rounded-lg" />
    <Skeleton className="h-10 w-full" />
    <Skeleton className="h-8 w-full" />
  </div>
)

interface CheckoutButtonProps {
  readonly children: ReactNode
  readonly featured: boolean
  readonly tier: LicenseTier
}

export const CheckoutButton = ({ children, featured, tier }: CheckoutButtonProps): JSX.Element => {
  const tTier = useTranslations("components.custom.pricing")
  const t = useTranslations("pages.license.buy")
  const isStarting = useIsMutating({ mutationKey: LICENSE_MUTATION_KEYS.START_CHECKOUT }) > 0
  const [isOpen, setOpen] = useState(false)

  return (
    <DialogTrigger isOpen={isOpen} onOpenChange={setOpen}>
      <Button className="h-11 w-full px-5 text-body-sm font-semibold" variant={featured ? "default" : "outline"}>
        {children}
      </Button>
      <Dialog
        className="max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg"
        isDismissable={!isStarting}
        isKeyboardDismissDisabled={isStarting}
        showCloseButton={false}
      >
        <DialogHeader>
          <DialogTitle>{t("consent.title")}</DialogTitle>
          <DialogDescription className="text-pretty">{t("consent.description", { tier: tTier(`tiers.${tier}.name`) })}</DialogDescription>
        </DialogHeader>
        <Suspense fallback={<CheckoutConsentPending />}>
          <CheckoutConsent
            onClose={() => {
              setOpen(false)
            }}
            tier={tier}
          />
        </Suspense>
      </Dialog>
    </DialogTrigger>
  )
}
