import type { JSX } from "react"

import { useTranslations } from "use-intl/react"

import { FieldError } from "~/src/presentation/components/shadcn/field"

interface ValidationFieldErrorProps {
  readonly id?: string | undefined
  readonly message?: string | undefined
  readonly namespace: string
  readonly params?: Record<string, Record<string, number>>
}

export const ValidationFieldError = ({ id, message, namespace, params }: ValidationFieldErrorProps): JSX.Element | undefined => {
  const t = useTranslations()
  const key = `${namespace}.${message}`

  if (message === undefined || message === "") {
    return undefined
  }

  return <FieldError id={id}>{t.has(key) ? t(key, params?.[message]) : t("errors.codes.VALIDATION")}</FieldError>
}
