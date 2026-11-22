import { useCallback, useEffect, useMemo, useState } from "react"

import { useSelector } from "@tanstack/react-form"

import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import type { LocalizedText } from "~/src/modules/_core/utils/localized-text"

import { type FormErrors, type LocaleStatus, type LocalizedEntry, invalidLocales, localeStatuses } from "~/src/lib/localized-form"

interface LocalizedFormState<TValues> extends FormErrors {
  readonly values: TValues
}

interface LocalizedForm<TValues> {
  readonly store: {
    get: () => LocalizedFormState<TValues>
    subscribe: (listener: (state: LocalizedFormState<TValues>) => void) => { unsubscribe: () => void }
  }
  validate: (cause: "change") => unknown
}

export interface FormLocale<TText extends string = string> {
  readonly locale: SupportedLocale
  readonly revalidate: () => void
  readonly setLocale: (locale: SupportedLocale) => void
  readonly showFirstInvalid: () => void
  readonly statuses: readonly LocaleStatus[]
  readonly texts: Readonly<Record<TText, LocalizedText>>
}

const sameItems = <TItem>(first: readonly TItem[], second: readonly TItem[]): boolean =>
  first.length === second.length && first.every((item, index) => item === second[index])

const sameRecords = <TKey extends string, TItem>(first: Readonly<Record<TKey, TItem>>, second: Readonly<Record<TKey, TItem>>): boolean =>
  sameItems(Object.keys(first), Object.keys(second)) && sameItems(Object.values(first), Object.values(second))

export const useFormLocale = <TValues, TText extends string>(
  form: LocalizedForm<TValues>,
  localized: (values: TValues) => { readonly lists?: readonly LocalizedEntry[]; readonly texts: Readonly<Record<TText, LocalizedText>> },
): FormLocale<TText> => {
  const [locale, setLocale] = useState<SupportedLocale>(I18N.DEFAULT_LOCALE)

  const texts = useSelector(form.store, (state) => localized(state.values).texts, { compare: sameRecords })
  const lists = useSelector(form.store, (state) => localized(state.values).lists?.flat() ?? [], { compare: sameItems })
  const invalid = useSelector(form.store, (state) => invalidLocales(state), { compare: sameItems })

  const statuses = useMemo(() => localeStatuses([...Object.values<LocalizedText>(texts), ...lists], invalid), [texts, lists, invalid])

  const revalidate = useCallback(() => {
    void form.validate("change")
  }, [form])

  useEffect(revalidate, [locale, revalidate])

  const showFirstInvalid = (): void => {
    const [first] = invalidLocales(form.store.get())
    if (first !== undefined) {
      setLocale(first)
    }
  }

  return { locale, revalidate, setLocale, showFirstInvalid, statuses, texts }
}
