import { useTranslations } from "use-intl/react"

import { AUTH_ERRORS, type AuthErrorMessageKey } from "~/src/integrations/better-auth/auth.errors"

import { ERROR_CODES, type ErrorCode } from "~/src/modules/_core/constants/errors"

const AUTH_ERROR_KEYS = new Set<string>(Object.values(AUTH_ERRORS))
const ERROR_CODE_KEYS = new Set<string>(Object.values(ERROR_CODES))
const VALIDATION_ERROR_NAMES = new Set(["ValidationError", "ZodError"])

const isAuthErrorKey = (message: string): message is AuthErrorMessageKey => AUTH_ERROR_KEYS.has(message)

const isErrorCode = (message: string): message is ErrorCode => ERROR_CODE_KEYS.has(message)

export const useErrorMessage = (): ((error: unknown) => string) => {
  const t = useTranslations()

  return (error) => {
    if (!(error instanceof Error)) {
      return t("errors.codes.INTERNAL_ERROR")
    }
    const { message, name } = error
    if (isAuthErrorKey(message)) {
      return t(`auth.errors.${message}`)
    }
    if (isErrorCode(message)) {
      return t(`errors.codes.${message}`)
    }
    if (VALIDATION_ERROR_NAMES.has(name)) {
      return t("errors.codes.VALIDATION")
    }
    return t("errors.codes.INTERNAL_ERROR")
  }
}
