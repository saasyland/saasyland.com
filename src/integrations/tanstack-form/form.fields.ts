import type { ValidationCause } from "@tanstack/react-form"
import * as zod from "zod"

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

const fieldErrorSchema = zod.union([zod.string(), zod.object({ message: zod.string() }).transform(({ message }) => message)])

export const fieldErrorMessage = ([error]: readonly unknown[]): string | undefined => fieldErrorSchema.safeParse(error).data
