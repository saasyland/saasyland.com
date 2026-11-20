import type { JSX } from "react"

import { AUTH_VALIDATION_PARAMS } from "~/src/integrations/better-auth/auth.constraints"
import { type StringField, fieldErrorMessage, isFieldInvalid } from "~/src/integrations/tanstack-form/form.fields"

import { Field, FieldLabel } from "~/src/presentation/components/shadcn/field"
import { Input } from "~/src/presentation/components/shadcn/input"

import { ValidationFieldError } from "~/src/presentation/components/custom/validation-field-error"

interface UserTextFieldProps {
  readonly autoComplete: "email" | "name" | "new-password"
  readonly field: StringField
  readonly id: string
  readonly label: string
  readonly type?: "email" | "password" | "text"
}

export const UserTextField = ({ autoComplete, field, id, label, type = "text" }: UserTextFieldProps): JSX.Element => {
  const isInvalid = isFieldInvalid(field)

  return (
    <Field data-invalid={isInvalid}>
      <FieldLabel htmlFor={id}>{label}</FieldLabel>
      <Input
        aria-describedby={`${id}-error`}
        aria-invalid={isInvalid}
        autoComplete={autoComplete}
        id={id}
        name={field.name}
        onBlur={field.handleBlur}
        onChange={(event) => {
          field.handleChange(event.target.value)
        }}
        type={type}
        value={field.state.value}
      />
      {isInvalid && (
        <ValidationFieldError
          id={`${id}-error`}
          message={fieldErrorMessage(field.state.meta.errors)}
          namespace="auth.validations"
          params={AUTH_VALIDATION_PARAMS}
        />
      )}
    </Field>
  )
}
