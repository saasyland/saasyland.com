import { useTranslations } from "use-intl/react"

import type { NavigationEntry } from "~/src/data/navigation.constants"

export const useNavigationLabel = (): ((entry: NavigationEntry) => string) => {
  const t = useTranslations("navigation")

  return (entry) => t(`${entry.area}.${entry.placement}.${entry.key}`)
}
