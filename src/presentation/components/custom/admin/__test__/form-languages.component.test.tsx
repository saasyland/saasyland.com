import type { JSX } from "react"

import { useForm } from "@tanstack/react-form"
import { screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { describe, expect, it, vi } from "vite-plus/test"
import * as zod from "zod"

import { type StringField, isFieldInvalid, validateOnBlur } from "~/src/integrations/tanstack-form/form.fields"
import { submitForm } from "~/src/integrations/tanstack-form/form.submit"
import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { LOCALES } from "~/src/modules/_core/constants/locale"
import {
  LOCALIZED_TEXT_MAX_LENGTH,
  type LocalizedText,
  localizedTextSchema,
  optionalLocalizedTextSchema,
} from "~/src/modules/_core/utils/localized-text"

import { useFormLocale } from "~/src/hooks/use-form-locale"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Field, FieldLabel } from "~/src/presentation/components/shadcn/field"
import { Input } from "~/src/presentation/components/shadcn/input"

import { renderAdmin } from "~/src/presentation/components/custom/admin/__test__/fixtures"
import { FormLanguages, TranslationsSheet } from "~/src/presentation/components/custom/admin/form-languages"

import locales from "~/messages/en-US/locales.json"
import labels from "~/messages/en-US/pages.admin.json"

vi.mock("~/src/integrations/use-intl/i18n.config", async (importOriginal) => {
  const original = await importOriginal<{ I18N: typeof I18N }>()
  const catalogue = await import("~/src/modules/_core/constants/locale")
  return { I18N: { ...original.I18N, SUPPORTED_LOCALES: catalogue.LOCALES.map((locale) => locale.code) } }
})

const copy = labels.components.formLanguages
const TOO_LONG = "x".repeat(LOCALIZED_TEXT_MAX_LENGTH + 1)
const schema = zod.object({ summary: optionalLocalizedTextSchema, title: localizedTextSchema })

interface Values {
  readonly summary: LocalizedText
  readonly title: LocalizedText
}

const DEFAULTS: Values = { summary: {}, title: { [I18N.DEFAULT_LOCALE]: "" } }

const TextInput = ({
  field,
  id,
  label,
  lang,
}: {
  readonly field: StringField
  readonly id: string
  readonly label: string
  readonly lang: SupportedLocale
}) => (
  <Field>
    <FieldLabel htmlFor={id}>{label}</FieldLabel>
    <Input
      aria-invalid={isFieldInvalid(field)}
      id={id}
      lang={lang}
      onBlur={field.handleBlur}
      onChange={(event) => {
        field.handleChange(event.target.value)
      }}
      value={field.state.value ?? ""}
    />
  </Field>
)

const LocalizedForm = ({ onSave }: { readonly onSave: (values: Values) => void }): JSX.Element => {
  const form = useForm({
    defaultValues: DEFAULTS,
    listeners: { onBlur: validateOnBlur },
    onSubmit: ({ value }) => {
      onSave(value)
    },
    validators: { onChange: schema },
  })
  const languages = useFormLocale(form, ({ summary, title }) => ({ texts: { summary, title } }))

  return (
    <form
      noValidate
      onSubmit={(event) => {
        void submitForm(event, form, languages.showFirstInvalid)
      }}
    >
      <FormLanguages languages={languages}>
        <TranslationsSheet
          fields={[
            { id: "title", label: "Title" },
            { id: "summary", label: "Summary" },
          ]}
          languages={languages}
        >
          {(text, locale, label) => (
            <form.Field name={`${text}.${locale}`}>
              {(field) => <TextInput field={field} id={`panel-${text}-${locale}`} label={label} lang={locale} />}
            </form.Field>
          )}
        </TranslationsSheet>
      </FormLanguages>
      <form.Field key={`title-${languages.locale}`} name={`title.${languages.locale}`}>
        {(field) => <TextInput field={field} id="title" label="Title" lang={languages.locale} />}
      </form.Field>
      <form.Field key={`summary-${languages.locale}`} name={`summary.${languages.locale}`}>
        {(field) => <TextInput field={field} id="summary" label="Summary" lang={languages.locale} />}
      </form.Field>
      <Button type="submit">Save</Button>
    </form>
  )
}

const renderForm = () => {
  const onSave = vi.fn<(values: Values) => void>()
  renderAdmin(<LocalizedForm onSave={onSave} />)
  return { onSave, user: userEvent.setup({ delay: null }) }
}

const languagePicker = (): HTMLElement => screen.getByRole("button", { name: new RegExp(copy.label, "u") })

const chooseLanguage = async (user: ReturnType<typeof userEvent.setup>, locale: SupportedLocale): Promise<void> => {
  await user.click(languagePicker())
  await user.click(await screen.findByRole("option", { name: new RegExp(locale, "u") }))
}

const fill = async (user: ReturnType<typeof userEvent.setup>, label: string, text: string): Promise<void> => {
  await user.click(screen.getByLabelText(label))
  await user.paste(text)
}

const progress = (complete: number): string =>
  copy.progress.replace("{complete}", String(complete)).replace("{total}", String(LOCALES.length))

describe("FormLanguages", () => {
  it("keeps one compact control for every supported language, however many there are", async () => {
    const { user } = renderForm()

    expect(I18N.SUPPORTED_LOCALES).toHaveLength(LOCALES.length)
    expect(screen.queryByRole("tablist")).toBeNull()
    expect(screen.getAllByRole("button")).toHaveLength(3)
    expect(screen.getByText(progress(0))).toBeVisible()

    await user.click(languagePicker())
    expect(await screen.findAllByRole("option")).toHaveLength(LOCALES.length)
    await user.keyboard("ukr")
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toStrictEqual([
      `${copy.states.missing} ${locales["uk-UA"]} uk-UA`,
    ])
    await user.keyboard("zzz")
    expect(screen.getByText(copy.noMatch)).toBeVisible()
  })

  it("switches every field to the chosen language and rates each language", async () => {
    const { onSave, user } = renderForm()

    await fill(user, "Title", "Pricing")
    await fill(user, "Summary", "How it works.")
    expect(screen.getByText(progress(1))).toBeVisible()
    await chooseLanguage(user, "pl-PL")
    expect(screen.getByLabelText("Title")).toHaveAttribute("lang", "pl-PL")
    expect(screen.getByLabelText("Summary")).toHaveValue("")
    await fill(user, "Title", "Cennik")
    await user.click(languagePicker())
    const polish = await screen.findByRole("option", { name: /pl-PL/u })
    expect(polish).toHaveTextContent(copy.states.partial)
    await user.click(polish)
    await fill(user, "Summary", "Jak to działa.")
    expect(screen.getByText(progress(2))).toBeVisible()
    await user.click(screen.getByRole("button", { name: "Save" }))

    expect(onSave).toHaveBeenCalledWith({
      summary: { "en-US": "How it works.", "pl-PL": "Jak to działa." },
      title: { "en-US": "Pricing", "pl-PL": "Cennik" },
    })
  })

  it("names the other languages with errors and moves to them", async () => {
    const { user } = renderForm()

    await fill(user, "Title", "Pricing")
    await chooseLanguage(user, "de-DE")
    await fill(user, "Title", TOO_LONG)
    await chooseLanguage(user, "en-US")

    const alert = screen.getByRole("alert")
    expect(alert).toHaveTextContent(copy.invalid.replace("{languages}", locales["de-DE"]))
    await user.click(within(alert).getByRole("button", { name: copy.showInvalid.replace("{language}", locales["de-DE"]) }))
    expect(screen.getByLabelText("Title")).toHaveAttribute("lang", "de-DE")
    expect(screen.queryByRole("alert")).toBeNull()
    expect(languagePicker()).toHaveTextContent(copy.states.invalid)
  })

  it("moves to the first language with an error when the form is submitted", async () => {
    const { onSave, user } = renderForm()

    await chooseLanguage(user, "ja-JP")
    await fill(user, "Title", "料金")
    await user.click(screen.getByRole("button", { name: "Save" }))

    const title = screen.getByLabelText("Title")
    expect(title).toHaveAttribute("lang", I18N.DEFAULT_LOCALE)
    expect(title).toHaveAttribute("aria-invalid", "true")
    expect(title).toHaveFocus()
    expect(onSave).not.toHaveBeenCalled()
  })
})

const openPanel = async (user: ReturnType<typeof userEvent.setup>): Promise<HTMLElement> => {
  await user.click(screen.getByRole("button", { name: copy.panel.open }))
  return screen.findByRole("dialog", { name: copy.panel.title })
}

const fillPolishInPanel = async (user: ReturnType<typeof userEvent.setup>, sheet: HTMLElement): Promise<void> => {
  const search = within(sheet).getByRole("searchbox", { name: copy.panel.search })
  await user.type(search, "pol")
  await user.click(within(sheet).getByLabelText(locales["pl-PL"]))
  await user.paste("Cennik")
  await user.clear(search)
}

describe("TranslationsSheet", () => {
  it("lists every language for one field, the source first, with what is missing", async () => {
    const { user } = renderForm()

    await fill(user, "Title", "Pricing")
    const sheet = await openPanel(user)

    const rows = within(sheet).getAllByRole("listitem")
    expect(rows).toHaveLength(LOCALES.length)
    expect(rows[0]).toHaveAttribute("data-locale", I18N.DEFAULT_LOCALE)
    expect(within(rows[0] ?? sheet).getByText(copy.states.complete)).toBeInTheDocument()
    expect(within(sheet).getByRole("tab", { name: /Title/u })).toHaveTextContent(String(LOCALES.length - 1))
  })

  it("fills a language in the panel, narrows it to the missing ones and saves with the form", async () => {
    const { onSave, user } = renderForm()

    await fill(user, "Title", "Pricing")
    const sheet = await openPanel(user)
    await fillPolishInPanel(user, sheet)
    await user.click(within(sheet).getByRole("button", { name: copy.panel.missingOnly }))
    expect(within(sheet).queryByLabelText(locales["pl-PL"])).toBeNull()
    expect(within(sheet).getAllByRole("listitem")).toHaveLength(LOCALES.length - 2)
    await user.click(within(sheet).getByRole("tab", { name: /Summary/u }))
    await user.type(within(sheet).getByRole("searchbox", { name: copy.panel.search }), "zzz")
    expect(within(sheet).getByText(copy.noMatch)).toBeVisible()
    await user.click(within(sheet).getByRole("button", { name: copy.panel.missingOnly }))
    await user.click(within(sheet).getByRole("button", { name: copy.panel.done }))
    await user.click(screen.getByRole("button", { name: "Save" }))

    expect(onSave).toHaveBeenCalledWith({ summary: {}, title: { "en-US": "Pricing", "pl-PL": "Cennik" } })
  })
})
