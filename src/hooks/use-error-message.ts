import { useTranslations } from "use-intl/react"

import { AUTH_ERRORS } from "~/src/integrations/better-auth/auth.errors"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"

const ERROR_NAMESPACES = new Map<string, string>([
  ...Object.values(AUTH_ERRORS).map((key) => [key, "auth.errors"] as const),
  ...Object.values(ERROR_CODES).map((code) => [code, "errors.codes"] as const),
])
const VALIDATION_ERROR_NAMES = new Set(["ValidationError", "ZodError"])

export const useErrorMessage = (): ((error: unknown) => string) => {
  const t = useTranslations()

  return (error) => {
    if (!(error instanceof Error)) {
      return t("errors.codes.INTERNAL_ERROR")
    }
    const { message, name } = error
    const namespace = ERROR_NAMESPACES.get(message)
    if (namespace !== undefined) {
      return t(`${namespace}.${message}`)
    }
    if (VALIDATION_ERROR_NAMES.has(name)) {
      return t("errors.codes.VALIDATION")
    }
    return t("errors.codes.INTERNAL_ERROR")
  }
}
