import { useFormatter } from "use-intl/react"

import { useNavigationLabel } from "~/src/hooks/use-navigation-label"

import { ADMIN_NAVIGATION } from "~/src/data/navigation"

const ADMIN_SECTIONS = ADMIN_NAVIGATION.flatMap(({ items }) => items)

export const useAdminSections = (): string => {
  const format = useFormatter()
  const navigationLabel = useNavigationLabel()

  return format.list(ADMIN_SECTIONS.map((section) => navigationLabel(section)))
}
