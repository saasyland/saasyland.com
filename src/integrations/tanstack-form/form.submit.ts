import type { SubmitEvent } from "react"
import { flushSync } from "react-dom"

import type { AnyFieldLikeMetaBase } from "@tanstack/react-form"

const INVALID_CONTROL_SELECTOR = "[aria-invalid='true']"

interface SubmittableForm<TName extends string> {
  readonly state: { readonly fieldMeta: Partial<Record<TName, unknown>>; readonly isValid: boolean }
  handleSubmit: () => Promise<void>
  setFieldMeta: (field: TName, updater: (meta: AnyFieldLikeMetaBase) => AnyFieldLikeMetaBase) => void
}

const isFieldName = <TName extends string>(fieldMeta: Partial<Record<TName, unknown>>, name: string): name is TName =>
  Object.hasOwn(fieldMeta, name)

export const submitForm = async <TName extends string>(
  event: SubmitEvent<HTMLFormElement>,
  form: SubmittableForm<TName>,
  revealInvalid?: () => void,
): Promise<void> => {
  event.preventDefault()
  const element = event.currentTarget
  await form.handleSubmit()
  if (form.state.isValid) {
    return
  }
  const { fieldMeta } = form.state
  flushSync(() => {
    for (const name of Object.keys(fieldMeta).filter((key) => isFieldName(fieldMeta, key))) {
      form.setFieldMeta(name, (meta) => ({ ...meta, isBlurred: true }))
    }
    revealInvalid?.()
  })
  element.querySelector<HTMLElement>(INVALID_CONTROL_SELECTOR)?.focus()
}

export interface FieldErrorTarget<TName extends string> {
  setFieldMeta: (field: TName, updater: (meta: AnyFieldLikeMetaBase) => AnyFieldLikeMetaBase) => void
}

interface FieldError<TName extends string> {
  readonly controlId: string
  readonly field: TName
  readonly message: string
}

export const showFieldError = <TName extends string>(
  form: FieldErrorTarget<TName>,
  { controlId, field, message }: FieldError<TName>,
): void => {
  flushSync(() => {
    form.setFieldMeta(field, (meta) => ({ ...meta, errorMap: { ...meta.errorMap, onSubmit: message }, isBlurred: true }))
  })
  document.querySelector<HTMLElement>(`[id="${controlId}"]`)?.focus()
}
