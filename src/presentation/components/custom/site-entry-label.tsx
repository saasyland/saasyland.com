import type { JSX } from "react"

import { useTranslations } from "use-intl/react"

import type { SiteEntry } from "~/src/data/navigation.constants"

export const SiteEntryLabel = ({ entry }: { readonly entry: SiteEntry }): JSX.Element => {
  const t = useTranslations()

  if (entry.signedIn === undefined) {
    return <>{t(entry.label)}</>
  }

  return (
    <>
      <span className="signed-in:hidden">{t(entry.label)}</span>
      <span className="hidden signed-in:inline">{t(entry.signedIn.label)}</span>
    </>
  )
}
