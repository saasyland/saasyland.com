import type { JSX, ReactNode } from "react"

import { Link } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { ROUTES } from "~/src/routes"

const RECORD_TAGS = {
  privacy: (chunks: ReactNode) => (
    <Link className="text-foreground underline underline-offset-4 hover:text-muted-foreground" to={ROUTES.PRIVACY}>
      {chunks}
    </Link>
  ),
}

export const AccountDeletionRecords = (): JSX.Element => {
  const t = useTranslations("components.custom.account-deletion-records")

  return <li>{t.rich("kept", RECORD_TAGS)}</li>
}
