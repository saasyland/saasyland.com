import type { JSX, ReactNode } from "react"

import { Plus, X } from "lucide-react"

import { type StringField, fieldErrorMessage, isFieldInvalid } from "~/src/integrations/tanstack-form/form.fields"
import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { COURSE_VALIDATION_PARAMS } from "~/src/modules/course/course.constants"

import { cn } from "~/src/lib/cn"
import { selectedOption } from "~/src/lib/select-option"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Field, FieldDescription, FieldLabel, FieldLegend, FieldSet } from "~/src/presentation/components/shadcn/field"
import { Input } from "~/src/presentation/components/shadcn/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "~/src/presentation/components/shadcn/select"
import { Textarea } from "~/src/presentation/components/shadcn/textarea"

import { RichText } from "~/src/presentation/components/custom/rich-text"
import { ValidationFieldError } from "~/src/presentation/components/custom/validation-field-error"

interface TextFieldProps {
  readonly field: StringField
  readonly id: string
  readonly label: string
  readonly lang?: SupportedLocale
}

const FieldMessage = ({ field, id }: { readonly field: StringField; readonly id: string }): JSX.Element | undefined => {
  if (!isFieldInvalid(field)) {
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
  <Field data-invalid={isFieldInvalid(field)}>
    <FieldLabel htmlFor={id}>{label}</FieldLabel>
    <Input
      aria-describedby={`${id}-error`}
      aria-invalid={isFieldInvalid(field)}
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
  <Field data-invalid={isFieldInvalid(field)}>
    <FieldLabel htmlFor={id}>{label}</FieldLabel>
    <Textarea
      aria-describedby={`${id}-error`}
      aria-invalid={isFieldInvalid(field)}
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

interface RichTextFieldProps extends TextFieldProps {
  readonly hint: string
  readonly previewLabel: string
}

export const CourseRichTextField = ({ field, hint, id, label, lang, previewLabel }: RichTextFieldProps): JSX.Element => {
  const text = field.state.value ?? ""

  return (
    <div className="flex flex-col gap-3">
      <Field data-invalid={isFieldInvalid(field)}>
        <FieldLabel htmlFor={id}>{label}</FieldLabel>
        <Textarea
          aria-describedby={`${id}-hint ${id}-error`}
          aria-invalid={isFieldInvalid(field)}
          className="min-h-40 font-mono text-spec"
          id={id}
          lang={lang}
          name={field.name}
          onBlur={field.handleBlur}
          onChange={(event) => {
            field.handleChange(event.target.value)
          }}
          value={text}
        />
        <FieldDescription id={`${id}-hint`}>{hint}</FieldDescription>
        <FieldMessage field={field} id={id} />
      </Field>
      {text.trim().length > 0 && (
        <section aria-label={previewLabel} className="rounded-lg border border-dashed border-border p-3 text-sm text-muted-foreground">
          <RichText lang={lang} text={text} />
        </section>
      )}
    </div>
  )
}

interface ListField {
  readonly state: { readonly value: readonly string[] | undefined }
  pushValue: (value: string) => void
}

interface CourseListFieldProps {
  readonly addLabel: string
  readonly children: (index: number) => ReactNode
  readonly field: ListField
  readonly label: string
  readonly max: number
}

export const CourseListField = ({ addLabel, children, field, label, max }: CourseListFieldProps): JSX.Element => {
  const items = field.state.value ?? []

  return (
    <FieldSet className="gap-2">
      <FieldLegend variant="label">{label}</FieldLegend>
      {items.length > 0 && (
        <ol className="flex flex-col gap-2">
          {items.map((_, index) => (
            <li key={index}>{children(index)}</li>
          ))}
        </ol>
      )}
      <Button
        className="self-start"
        isDisabled={items.length >= max}
        onPress={() => {
          field.pushValue("")
        }}
        size="sm"
        variant="outline"
      >
        <Plus aria-hidden className="size-4" />
        {addLabel}
      </Button>
    </FieldSet>
  )
}

export const CourseCompactField = ({
  field,
  id,
  isCode = false,
  label,
  lang,
}: TextFieldProps & { readonly isCode?: boolean }): JSX.Element => (
  <Field className="min-w-0 flex-1" data-invalid={isFieldInvalid(field)}>
    <FieldLabel className="sr-only" htmlFor={id}>
      {label}
    </FieldLabel>
    <Input
      aria-describedby={`${id}-error`}
      aria-invalid={isFieldInvalid(field)}
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

export const RemoveItemButton = ({ label, onRemove }: { readonly label: string; readonly onRemove: () => void }): JSX.Element => (
  <Button aria-label={label} className="size-8 shrink-0 text-muted-foreground" onPress={onRemove} size="icon" variant="ghost">
    <X aria-hidden className="size-4" />
  </Button>
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
