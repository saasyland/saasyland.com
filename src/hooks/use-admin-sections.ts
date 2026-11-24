import { useFormatter, useTranslations } from "use-intl/react"

import { ADMIN_NAVIGATION } from "~/src/data/navigation"

const ADMIN_SECTIONS = ADMIN_NAVIGATION.flatMap(({ items }) => items)

export const useAdminSections = (): string => {
  const format = useFormatter()
  const t = useTranslations()

  return format.list(ADMIN_SECTIONS.map((section) => t(section.label)))
}
