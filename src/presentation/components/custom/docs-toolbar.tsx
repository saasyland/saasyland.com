import type { ComponentProps, JSX } from "react"

import { Header } from "@fumadocs/base-ui/layouts/docs/slots/header"
import { useTranslations } from "use-intl/react"

export const DocsToolbar = (props: ComponentProps<"header">): JSX.Element => {
  const t = useTranslations("navigation.content")

  return (
    <nav aria-label={t("header.docs")} className="contents">
      <Header {...props} />
    </nav>
  )
}
