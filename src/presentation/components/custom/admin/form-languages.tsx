import { type JSX, type ReactNode, useEffect, useState } from "react"

import { CircleAlert, CircleCheck, CircleDashed, CircleDot, Filter, Languages, Search } from "lucide-react"
import { Autocomplete, useFilter } from "react-aria-components"
import { useFormatter, useTranslations } from "use-intl/react"

import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { localeField } from "~/src/modules/_core/utils/zod-fields"

import type { FormLocale } from "~/src/hooks/use-form-locale"

import { cn } from "~/src/lib/cn"
import { LOCALE_STATE, type LocaleState, type LocaleStatus, isFilled } from "~/src/lib/localized-form"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Input } from "~/src/presentation/components/shadcn/input"
import {
  Select,
  SelectEmpty,
  SelectInput,
  SelectItem,
  SelectList,
  SelectPopover,
  SelectTrigger,
  SelectValue,
} from "~/src/presentation/components/shadcn/select"
import {
  Sheet,
  SheetClose,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "~/src/presentation/components/shadcn/sheet"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "~/src/presentation/components/shadcn/tabs"
import { Toggle } from "~/src/presentation/components/shadcn/toggle"

const STATE_ICONS = {
  [LOCALE_STATE.COMPLETE]: CircleCheck,
  [LOCALE_STATE.INVALID]: CircleAlert,
  [LOCALE_STATE.MISSING]: CircleDashed,
  [LOCALE_STATE.PARTIAL]: CircleDot,
} as const

export const LocaleStateIcon = ({ state }: { readonly state: LocaleState }): JSX.Element => {
  const t = useTranslations("pages.admin.components.formLanguages")
  const Icon = STATE_ICONS[state]

  return (
    <span className="inline-flex shrink-0 items-center">
      <Icon
        aria-hidden
        className={cn("size-4", {
          "text-amber-600 dark:text-amber-400": state === LOCALE_STATE.PARTIAL,
          "text-destructive": state === LOCALE_STATE.INVALID,
          "text-muted-foreground/70": state === LOCALE_STATE.MISSING,
          "text-ring": state === LOCALE_STATE.COMPLETE,
        })}
        strokeWidth={1.75}
      />
      <span className="sr-only">{t(`states.${state}`)}</span>
    </span>
  )
}

const LocaleOption = ({ status }: { readonly status: LocaleStatus }): JSX.Element => {
  const t = useTranslations()

  return (
    <span className="flex min-w-0 flex-1 items-center gap-2">
      <LocaleStateIcon state={status.state} /> <span className="min-w-0 truncate">{t(`locales.${status.id}`)}</span>{" "}
      <span className="ml-auto font-mono text-spec text-muted-foreground">{status.id}</span>
    </span>
  )
}

const LocalePicker = ({ languages }: { readonly languages: FormLocale }): JSX.Element => {
  const t = useTranslations()

  const { contains } = useFilter({ sensitivity: "base" })

  return (
    <Select
      className="min-w-0 flex-1 @xl:max-w-80"
      fieldLabel={t("pages.admin.components.formLanguages.label")}
      fieldLabelClassName="sr-only"
      onChange={(key) => {
        languages.setLocale(localeField.catch(languages.locale).parse(key))
      }}
      value={languages.locale}
    >
      <SelectTrigger className="h-8 w-full bg-background">
        <SelectValue className="min-w-0">
          {languages.statuses
            .filter((status) => status.id === languages.locale)
            .map((status) => (
              <LocaleOption key={status.id} status={status} />
            ))}
        </SelectValue>
      </SelectTrigger>
      <SelectPopover className="flex max-h-80 min-w-72 flex-col" placement="bottom start">
        <Autocomplete filter={contains}>
          <SelectInput aria-label={t("pages.admin.components.formLanguages.search")} autoFocus />
          <SelectList
            className="p-1"
            items={languages.statuses}
            renderEmptyState={() => <SelectEmpty className="flex">{t("pages.admin.components.formLanguages.noMatch")}</SelectEmpty>}
          >
            {(status) => (
              <SelectItem id={status.id} textValue={`${t(`locales.${status.id}`)} ${status.id}`}>
                <LocaleOption status={status} />
              </SelectItem>
            )}
          </SelectList>
        </Autocomplete>
      </SelectPopover>
    </Select>
  )
}

const InvalidLanguages = ({ languages }: { readonly languages: FormLocale }): JSX.Element | undefined => {
  const t = useTranslations()
  const format = useFormatter()

  const invalid = languages.statuses.filter((status) => status.state === LOCALE_STATE.INVALID && status.id !== languages.locale)
  const [first] = invalid

  if (first === undefined) {
    return undefined
  }

  return (
    <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-body-sm text-destructive" role="alert">
      {t("pages.admin.components.formLanguages.invalid", {
        count: invalid.length,
        languages: format.list(invalid.map((status) => t(`locales.${status.id}`))),
      })}
      <Button
        className="h-auto p-0 text-body-sm text-destructive underline underline-offset-4"
        onPress={() => {
          languages.setLocale(first.id)
        }}
        variant="link"
      >
        {t("pages.admin.components.formLanguages.showInvalid", { language: t(`locales.${first.id}`) })}
      </Button>
    </p>
  )
}

interface FormLanguagesProps {
  readonly children?: ReactNode
  readonly languages: FormLocale
}

export const FormLanguages = ({ children, languages }: FormLanguagesProps): JSX.Element => {
  const t = useTranslations("pages.admin.components.formLanguages")

  const complete = languages.statuses.filter((status) => status.state === LOCALE_STATE.COMPLETE).length

  return (
    <div className="flex flex-col gap-2">
      <div className="@container rounded-lg border border-border bg-muted/40 p-2">
        <div className="flex flex-col gap-2 @xl:flex-row @xl:items-center @xl:gap-3">
          <span className="flex min-w-0 flex-1 items-center gap-2">
            <Languages aria-hidden className="ml-1 size-4 shrink-0 text-muted-foreground" strokeWidth={1.75} />
            <LocalePicker languages={languages} />
          </span>
          <span className="flex items-center justify-between gap-3 pl-1">
            <span className="text-spec text-muted-foreground tabular-nums">
              {t("progress", { complete, total: languages.statuses.length })}
            </span>
            {children}
          </span>
        </div>
      </div>
      <InvalidLanguages languages={languages} />
    </div>
  )
}

export interface TranslationField<TText extends string> {
  readonly id: TText
  readonly label: string
}

interface TranslationsSheetProps<TText extends string> {
  readonly children: (field: TText, locale: SupportedLocale, label: string) => ReactNode
  readonly fields: readonly TranslationField<TText>[]
  readonly languages: FormLocale<TText>
}

interface TranslationRowsProps<TText extends string> extends Omit<TranslationsSheetProps<TText>, "fields"> {
  readonly field: TText
  readonly query: string
  readonly shown: ReadonlyMap<TText, ReadonlySet<SupportedLocale>> | undefined
}

const SOURCE_FIRST = [I18N.DEFAULT_LOCALE, ...I18N.SUPPORTED_LOCALES.filter((locale) => locale !== I18N.DEFAULT_LOCALE)]

const TranslationRows = <TText extends string>({ children, field, languages, query, shown }: TranslationRowsProps<TText>): JSX.Element => {
  const t = useTranslations()

  const { contains } = useFilter({ sensitivity: "base" })

  const { revalidate } = languages
  const text = languages.texts[field]
  const rows = SOURCE_FIRST.filter(
    (locale) => (shown?.get(field)?.has(locale) ?? true) && (contains(t(`locales.${locale}`), query) || contains(locale, query)),
  )

  useEffect(revalidate, [query, revalidate, shown])

  return (
    <ul className="flex flex-col divide-y divide-border">
      {rows.length === 0 && (
        <li className="py-6 text-center text-body-sm text-muted-foreground">{t("pages.admin.components.formLanguages.noMatch")}</li>
      )}
      {rows.map((locale) => (
        <li className="flex items-start gap-3 py-3" data-locale={locale} key={locale}>
          <span className="pt-0.5">
            <LocaleStateIcon state={isFilled(text, locale) ? LOCALE_STATE.COMPLETE : LOCALE_STATE.MISSING} />
          </span>
          <div className="min-w-0 flex-1">{children(field, locale, t(`locales.${locale}`))}</div>
        </li>
      ))}
    </ul>
  )
}

export const TranslationsSheet = <TText extends string>({ children, fields, languages }: TranslationsSheetProps<TText>): JSX.Element => {
  const t = useTranslations("pages.admin.components.formLanguages.panel")
  const [query, setQuery] = useState("")
  const [shown, setShown] = useState<ReadonlyMap<TText, ReadonlySet<SupportedLocale>>>()

  const missingIn = (field: TText): readonly SupportedLocale[] =>
    I18N.SUPPORTED_LOCALES.filter((locale) => !isFilled(languages.texts[field], locale))

  return (
    <SheetTrigger>
      <Button size="sm" variant="outline">
        <Languages aria-hidden strokeWidth={1.75} />
        {t("open")}
      </Button>
      <Sheet className="w-full data-[side=right]:sm:max-w-xl">
        <SheetHeader className="border-b border-border pr-12">
          <SheetTitle>{t("title")}</SheetTitle>
          <SheetDescription>{t("description")}</SheetDescription>
        </SheetHeader>
        <Tabs className="min-h-0 flex-1 gap-0">
          <div className="flex flex-col gap-3 border-b border-border px-4 pb-3">
            <TabsList aria-label={t("fields")} className="w-full justify-start overflow-x-auto" variant="line">
              {fields.map((field) => (
                <TabsTrigger className="flex-none" id={field.id} key={field.id}>
                  {field.label}
                  <span className="text-spec font-normal text-muted-foreground tabular-nums">
                    {t("missing", { count: missingIn(field.id).length })}
                  </span>
                </TabsTrigger>
              ))}
            </TabsList>
            <div className="flex flex-wrap items-center gap-3">
              <div className="group relative min-w-0 flex-1 basis-48">
                <Search
                  aria-hidden
                  className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground transition-colors group-focus-within:text-foreground"
                />
                <Input
                  aria-label={t("search")}
                  className="h-8 pl-8"
                  onChange={(event) => {
                    setQuery(event.target.value)
                  }}
                  placeholder={t("search")}
                  type="search"
                  value={query}
                />
              </div>
              <Toggle
                isSelected={shown !== undefined}
                onChange={(isSelected) => {
                  setShown(isSelected ? new Map(fields.map((field) => [field.id, new Set(missingIn(field.id))])) : undefined)
                }}
                variant="outline"
              >
                <Filter aria-hidden strokeWidth={1.75} />
                {t("missingOnly")}
              </Toggle>
            </div>
          </div>
          {fields.map((field) => (
            <TabsContent className="custom-scrollbar min-h-0 overflow-y-auto px-4" id={field.id} key={field.id}>
              <TranslationRows field={field.id} languages={languages} query={query} shown={shown}>
                {children}
              </TranslationRows>
            </TabsContent>
          ))}
        </Tabs>
        <SheetFooter className="border-t border-border">
          <SheetClose className="self-end" variant="default">
            {t("done")}
          </SheetClose>
        </SheetFooter>
      </Sheet>
    </SheetTrigger>
  )
}
