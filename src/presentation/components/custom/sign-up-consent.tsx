import type { JSX, ReactNode } from "react"

import { Link } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { Skeleton } from "~/src/presentation/components/shadcn/skeleton"

import * as ROUTES from "~/src/routes"

const LEGAL_LINK_CLASS = "text-foreground underline underline-offset-4 transition-colors duration-200 ease-exp hover:text-muted-foreground"

const LEGAL_TAGS = {
  privacy: (chunks: ReactNode) => (
    <Link className={LEGAL_LINK_CLASS} to={ROUTES.PRIVACY}>
      {chunks}
    </Link>
  ),
  terms: (chunks: ReactNode) => (
    <Link className={LEGAL_LINK_CLASS} to={ROUTES.TERMS}>
      {chunks}
    </Link>
  ),
}

export const SignUpConsent = (): JSX.Element => {
  const t = useTranslations("components.custom.sign-up-consent")

  return <p className="text-body-sm text-pretty text-muted-foreground">{t.rich("termsAndPrivacy", LEGAL_TAGS)}</p>
}

export const SignUpConsentPending = (): JSX.Element => (
  <div className="flex flex-col text-body-sm">
    <Skeleton className="h-lh w-full scale-y-70" />
    <Skeleton className="h-lh w-1/4 scale-y-70" />
  </div>
)
