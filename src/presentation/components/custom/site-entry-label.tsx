import type { JSX } from "react"

import { useTranslations } from "use-intl/react"

import type { SiteEntry } from "~/src/data/navigation.constants"

import { cn } from "~/src/lib/cn"

export const SiteEntryLabel = ({ className, entry }: { readonly className?: string; readonly entry: SiteEntry }): JSX.Element => {
  const t = useTranslations()

  if (entry.signedIn === undefined) {
    return <>{t(entry.label)}</>
  }

  return (
    <span className={cn("inline-grid", className)}>
      <span className="[grid-area:1/1] signed-in:invisible">{t(entry.label)}</span>
      <span className="invisible [grid-area:1/1] signed-in:visible">{t(entry.signedIn.label)}</span>
    </span>
  )
}
