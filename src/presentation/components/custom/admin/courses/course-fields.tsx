import type { JSX, ReactNode } from "react"

import { type StringField, fieldErrorMessage } from "~/src/integrations/tanstack-form/form.fields"
import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { COURSE_VALIDATION_PARAMS } from "~/src/modules/course/course.constants"

import { cn } from "~/src/lib/cn"
import { selectedOption } from "~/src/lib/select-option"

import { Field, FieldLabel } from "~/src/presentation/components/shadcn/field"
import { Input } from "~/src/presentation/components/shadcn/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/presentation/components/shadcn/select"
import { Textarea } from "~/src/presentation/components/shadcn/textarea"

import { ValidationFieldError } from "~/src/presentation/components/custom/validation-field-error"

interface TextFieldProps {
  readonly field: StringField
  readonly id: string
  readonly label: string
  readonly lang?: SupportedLocale
}

const isInvalidField = ({ state: { meta } }: StringField): boolean => meta.isTouched && !meta.isValid

const FieldMessage = ({ field, id }: { readonly field: StringField; readonly id: string }): JSX.Element | undefined => {
  if (!isInvalidField(field)) {
    return undefined
  }
  return (
    <ValidationFieldError
      id={`${id}-error`}
      message={fieldErrorMessage(field.state.meta.errors)}
      namespace="course.validations"
      params={COURSE_VALIDATION_PARAMS}
    />
  )
}

export const CourseTextField = ({
  field,
  id,
  isCode = false,
  label,
  lang,
}: TextFieldProps & { readonly isCode?: boolean }): JSX.Element => (
  <Field data-invalid={isInvalidField(field)}>
    <FieldLabel htmlFor={id}>{label}</FieldLabel>
    <Input
      aria-describedby={`${id}-error`}
      aria-invalid={isInvalidField(field)}
      className={cn({ "font-mono": isCode })}
      id={id}
      lang={lang}
      name={field.name}
      onBlur={field.handleBlur}
      onChange={(event) => {
        field.handleChange(event.target.value)
      }}
      value={field.state.value ?? ""}
    />
    <FieldMessage field={field} id={id} />
  </Field>
)

export const CourseTextAreaField = ({ field, id, label, lang }: TextFieldProps): JSX.Element => (
  <Field data-invalid={isInvalidField(field)}>
    <FieldLabel htmlFor={id}>{label}</FieldLabel>
    <Textarea
      aria-describedby={`${id}-error`}
      aria-invalid={isInvalidField(field)}
      id={id}
      lang={lang}
      name={field.name}
      onBlur={field.handleBlur}
      onChange={(event) => {
        field.handleChange(event.target.value)
      }}
      value={field.state.value ?? ""}
    />
    <FieldMessage field={field} id={id} />
  </Field>
)

interface CourseOptionFieldProps<TOption extends string> {
  readonly children: (option: TOption) => ReactNode
  readonly label: string
  readonly onChange: (option: TOption) => void
  readonly options: readonly TOption[]
  readonly value: TOption
}

export const CourseOptionField = <TOption extends string>({
  children,
  label,
  onChange,
  options,
  value,
}: CourseOptionFieldProps<TOption>): JSX.Element => (
  <Field>
    <Select
      className="w-full"
      fieldLabel={label}
      onChange={(key) => {
        const option = selectedOption(options, key)
        if (option !== undefined) {
          onChange(option)
        }
      }}
      value={value}
    >
      <SelectTrigger className="w-full">
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {options.map((option) => (
          <SelectItem id={option} key={option}>
            {children(option)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  </Field>
)
