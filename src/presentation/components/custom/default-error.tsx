import { type JSX, useEffect, useState } from "react"

import { useQueryErrorResetBoundary } from "@tanstack/react-query"
import { type ErrorComponentProps, useRouter } from "@tanstack/react-router"
import { Button } from "react-aria-components"
import { useTranslations } from "use-intl/react"

import { CTA_CLASSES } from "~/src/data/cta"

import { cn } from "~/src/lib/cn"
import { claimReload, isStaleBuildError, whenPageStays } from "~/src/lib/stale-build"

import { ContentPage } from "~/src/presentation/components/custom/content-page"

export const DefaultError = ({ error }: ErrorComponentProps): JSX.Element => {
  const t = useTranslations("errors.global")
  const router = useRouter()
  const queryErrorResetBoundary = useQueryErrorResetBoundary()
  const [isReloading, setIsReloading] = useState(() => isStaleBuildError(error))

  useEffect(() => {
    const showError = (): void => {
      setIsReloading(false)
      console.error(error)
      queryErrorResetBoundary.reset()
    }

    if (!isStaleBuildError(error)) {
      showError()
      return
    }

    return whenPageStays(() => {
      const destination = router.history.location.href
      if (claimReload(destination)) {
        void router.navigate({ href: destination, ignoreBlocker: true, reloadDocument: true, replace: true })
        return
      }

      showError()
    })
  }, [error, queryErrorResetBoundary, router])

  if (isReloading) {
    return <div aria-busy="true" className="flex-1" data-slot="default-error" />
  }

  return (
    <div className="flex-1" data-slot="default-error" role="alert">
      <ContentPage lead={t("description")} title={t("title")}>
        <div className="mt-10">
          <Button
            className={cn(CTA_CLASSES.PRIMARY, "cursor-pointer")}
            onPress={() => {
              void router.invalidate()
            }}
          >
            {t("retry")}
          </Button>
        </div>
      </ContentPage>
    </div>
  )
}
