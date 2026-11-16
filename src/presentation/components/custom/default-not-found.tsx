import type { JSX } from "react"

import { useTranslations } from "use-intl/react"

import { BackHomeLink } from "~/src/presentation/components/custom/back-home-link"
import { ContentPage } from "~/src/presentation/components/custom/content-page"

export const DefaultNotFound = (): JSX.Element => {
  const t = useTranslations("errors.not-found")

  return (
    <ContentPage lead={t("metadata.description")} title={t("metadata.title")}>
      <div className="mt-10">
        <BackHomeLink />
      </div>
    </ContentPage>
  )
}
