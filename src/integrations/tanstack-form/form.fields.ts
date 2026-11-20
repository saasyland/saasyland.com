import type { ValidationCause } from "@tanstack/react-form"

interface FieldErrorTiming {
  readonly state: { readonly meta: { readonly isBlurred: boolean; readonly isValid: boolean } }
}

export interface StringField {
  readonly name: string
  readonly state: {
    readonly value: string | undefined
    readonly meta: { readonly errors: readonly unknown[]; readonly isBlurred: boolean; readonly isValid: boolean }
  }
  handleBlur: () => void
  handleChange: (value: string) => void
}

export const isFieldInvalid = ({ state: { meta } }: FieldErrorTiming): boolean => meta.isBlurred && !meta.isValid

interface BlurredField {
  readonly fieldApi: { validate: (cause: ValidationCause) => unknown }
}

export const validateOnBlur = ({ fieldApi }: BlurredField): void => {
  void fieldApi.validate("change")
}

export const fieldErrorMessage = (errors: readonly unknown[]): string | undefined => {
  const [error] = errors
  if (typeof error === "string") {
    return error
  }
  if (typeof error === "object" && error !== null && "message" in error && typeof error.message === "string") {
    return error.message
  }
  return undefined
}
