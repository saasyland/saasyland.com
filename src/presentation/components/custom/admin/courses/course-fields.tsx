import type { JSX, ReactNode } from "react"

import { Plus, X } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { type StringField, fieldErrorMessage, isFieldInvalid } from "~/src/integrations/tanstack-form/form.fields"
import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

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
  readonly lang?: SupportedLocale | undefined
  readonly source?: string | undefined
}

const describedBy = (id: string): string => `${id}-language ${id}-source ${id}-error`

const FieldHeading = ({ id, label, lang }: Omit<TextFieldProps, "field" | "source">): JSX.Element => (
  <div className="flex items-center justify-between gap-3">
    <FieldLabel htmlFor={id}>{label}</FieldLabel>
    {lang !== undefined && (
      <span className="font-mono text-spec text-muted-foreground" id={`${id}-language`}>
        {lang}
      </span>
    )}
  </div>
)

const SourceText = ({ id, lang, source }: Omit<TextFieldProps, "field" | "label">): JSX.Element | undefined => {
  const t = useTranslations()

  if (lang === I18N.DEFAULT_LOCALE || source === undefined || source.trim().length === 0) {
    return undefined
  }
  return (
    <FieldDescription className="line-clamp-3" id={`${id}-source`}>
      <span className="font-medium text-foreground/80">
        {t("pages.admin.courses.fields.source", { language: t(`locales.${I18N.DEFAULT_LOCALE}`) })}
      </span>{" "}
      <span lang={I18N.DEFAULT_LOCALE}>{source}</span>
    </FieldDescription>
  )
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
  source,
}: TextFieldProps & { readonly isCode?: boolean }): JSX.Element => (
  <Field data-invalid={isFieldInvalid(field)}>
    <FieldHeading id={id} label={label} lang={lang} />
    <Input
      aria-describedby={describedBy(id)}
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
    <SourceText id={id} lang={lang} source={source} />
    <FieldMessage field={field} id={id} />
  </Field>
)

export const CourseTextAreaField = ({ field, id, label, lang, source }: TextFieldProps): JSX.Element => (
  <Field data-invalid={isFieldInvalid(field)}>
    <FieldHeading id={id} label={label} lang={lang} />
    <Textarea
      aria-describedby={describedBy(id)}
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
    <SourceText id={id} lang={lang} source={source} />
    <FieldMessage field={field} id={id} />
  </Field>
)

interface RichTextFieldProps extends TextFieldProps {
  readonly hint: string
  readonly previewLabel: string
}

export const CourseRichTextField = ({ field, hint, id, label, lang, previewLabel, source }: RichTextFieldProps): JSX.Element => {
  const text = field.state.value ?? ""

  return (
    <div className="flex flex-col gap-3">
      <Field data-invalid={isFieldInvalid(field)}>
        <FieldHeading id={id} label={label} lang={lang} />
        <Textarea
          aria-describedby={`${id}-hint ${describedBy(id)}`}
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
        <SourceText id={id} lang={lang} source={source} />
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
  readonly lang: SupportedLocale
  readonly max: number
}

export const CourseListField = ({ addLabel, children, field, label, lang, max }: CourseListFieldProps): JSX.Element => {
  const items = field.state.value ?? []

  return (
    <FieldSet className="gap-2">
      <div className="flex items-center justify-between gap-3">
        <FieldLegend className="mb-0" variant="label">
          {label}
        </FieldLegend>
        <span className="font-mono text-spec text-muted-foreground">{lang}</span>
      </div>
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
