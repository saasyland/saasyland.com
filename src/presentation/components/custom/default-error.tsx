import { type JSX, useEffect, useState } from "react"

import { useQueryErrorResetBoundary } from "@tanstack/react-query"
import { type ErrorComponentProps, useRouter } from "@tanstack/react-router"
import { useTranslations } from "use-intl/react"

import { claimReload, isStaleBuildError } from "~/src/lib/stale-build"

import { Button } from "~/src/presentation/components/shadcn/button"

export const DefaultError = ({ error }: ErrorComponentProps): JSX.Element => {
  const t = useTranslations("errors.global")
  const router = useRouter()
  const queryErrorResetBoundary = useQueryErrorResetBoundary()
  const [isReloading, setIsReloading] = useState(() => isStaleBuildError(error))

  useEffect(() => {
    const destination = router.history.location.href
    if (isStaleBuildError(error) && claimReload(destination)) {
      void router.navigate({ href: destination, ignoreBlocker: true, reloadDocument: true, replace: true })
      return
    }

    setIsReloading(false)
    console.error(error)
    queryErrorResetBoundary.reset()
  }, [error, queryErrorResetBoundary, router])

  if (isReloading) {
    return <main aria-busy="true" className="flex-1" />
  }

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center" role="alert">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-medium tracking-tight text-foreground">{t("title")}</h1>
        <p className="max-w-prose text-sm text-muted-foreground">{t("description")}</p>
      </div>
      <Button
        onPress={() => {
          void router.invalidate()
        }}
        variant="outline"
      >
        {t("retry")}
      </Button>
    </main>
  )
}
