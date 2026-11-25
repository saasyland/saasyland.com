import type { JSX } from "react"

import { Link } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { CTA_CLASSES } from "~/src/data/cta"

import { ROUTES } from "~/src/routes"

export const BackHomeLink = (): JSX.Element => {
  const t = useTranslations("common")

  return (
    <Link className={CTA_CLASSES.PRIMARY} to={ROUTES.HOME}>
      {t("backHome")}
    </Link>
  )
}
