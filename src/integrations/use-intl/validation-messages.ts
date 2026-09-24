import { VALIDATION_MESSAGE_KEYS } from "~/src/integrations/use-intl/validation-keys"

type ValidationKey = (typeof VALIDATION_MESSAGE_KEYS)[number]
export type ValidationNamespace = ValidationKey extends `${infer Module}.validations.${string}` ? `${Module}.validations` : never
type ValidationTranslator = (key: ValidationKey | "errors.action.VALIDATION", values?: Record<string, string | number>) => string

export const translateValidationMessage = (
  { namespace, message }: Readonly<{ namespace: ValidationNamespace; message: string }>,
  t: ValidationTranslator,
  paramsByKey?: Readonly<Record<string, Readonly<Record<string, string | number>>>>,
): string => {
  const key = VALIDATION_MESSAGE_KEYS.find((candidate) => candidate === `${namespace}.${message}`)
  if (key === undefined) {
    return t("errors.action.VALIDATION")
  }
  const params = paramsByKey?.[message]

  return params === undefined ? t(key) : t(key, params)
}
