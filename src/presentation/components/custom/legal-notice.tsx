import type { JSX } from "react"

import { Callout } from "@fumadocs/base-ui/components/callout"
import { useTranslations } from "use-intl/react"

export const LegalNotice = (): JSX.Element => {
  const t = useTranslations("components.custom.legal-notice")

  return (
    <Callout title={t("title")} type="warn">
      <p>{t("body")}</p>
    </Callout>
  )
}
