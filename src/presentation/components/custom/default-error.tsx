import { useEffect } from "react"

import { useQueryErrorResetBoundary } from "@tanstack/react-query"
import { type ErrorComponentProps, useRouter } from "@tanstack/react-router"

import { getGlobalErrorMessages } from "~/src/integrations/use-intl/i18n.errors"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { Button } from "~/src/presentation/components/shadcn/button"

export const DefaultError = ({ error }: ErrorComponentProps) => {
  const router = useRouter()
  const queryErrorResetBoundary = useQueryErrorResetBoundary()
  const messages = getGlobalErrorMessages(getCurrentLocale())

  useEffect(() => {
    console.error(error)
    queryErrorResetBoundary.reset()
  }, [error, queryErrorResetBoundary])

  return (
    <main role="alert" className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-24 text-center">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-medium tracking-tight text-foreground">{messages.title}</h1>
        <p className="max-w-prose text-sm text-muted-foreground">{messages.description}</p>
      </div>
      <Button
        variant="outline"
        onPress={() => {
          void router.invalidate()
        }}
      >
        {messages.retry}
      </Button>
    </main>
  )
}
