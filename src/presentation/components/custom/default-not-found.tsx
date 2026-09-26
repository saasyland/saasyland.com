import type { JSX } from "react"

import { Link } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { buttonVariants } from "~/src/presentation/components/shadcn/button"

import { ROUTES } from "~/src/routes"

export const DefaultNotFound = (): JSX.Element => {
  const t = useTranslations("errors.notFound")

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <div className="flex flex-col gap-2">
        <p className="text-sm font-medium text-muted-foreground">404</p>
        <h1 className="text-3xl font-medium tracking-tight text-foreground">{t("title")}</h1>
        <p className="max-w-prose text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <Link className={buttonVariants({ variant: "outline" })} to={ROUTES.HOME}>
        {t("backHome")}
      </Link>
    </main>
  )
}
