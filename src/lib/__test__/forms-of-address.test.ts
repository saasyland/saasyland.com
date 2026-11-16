import { describe, expect, it } from "vite-plus/test"

import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { FORMS_OF_ADDRESS, formOfAddressProblems } from "~/src/lib/forms-of-address"

const problem = (locale: SupportedLocale, word: string): string =>
  `uses “${word}” where ${locale} addresses the reader as “${FORMS_OF_ADDRESS[locale].form}”`

describe("FORMS_OF_ADDRESS", () => {
  it("names one form of address for every supported locale", () => {
    expect(Object.keys(FORMS_OF_ADDRESS).toSorted()).toEqual([...I18N.SUPPORTED_LOCALES].toSorted())
  })
})

describe("formOfAddressProblems", () => {
  it.each([
    { found: ["Sie", "Ihre", "Ihrem"], locale: "de-DE", text: "Bitte geben Sie Ihre Daten ein, um sich bei Ihrem Konto anzumelden." },
    { found: ["Dich", "Du"], locale: "de-DE", text: "Melde Dich an, sobald Du bereit bist." },
    { found: ["Tu", "ta"], locale: "fr-FR", text: "Tu ne peux pas modifier ta propre adresse." },
    { found: ["t'"], locale: "fr-FR", text: "Le lien t'attend dans la boîte de réception." },
    { found: ["toi"], locale: "fr-FR", text: "Pour continuer, reconnecte-toi." },
    { found: ["usted", "Ud."], locale: "es-ES", text: "Al registrarse, usted acepta los términos. Ud. puede cancelar." },
    { found: ["vostra", "Lei", "Suo"], locale: "it-IT", text: "Potete usare la vostra licenza, e Lei resta responsabile del Suo account." },
    { found: ["である", "だ"], locale: "ja-JP", text: "型は契約である。これは制約だ。" },
    { found: ["twoje", "Pan"], locale: "pl-PL", text: "Zablokowaliśmy żądanie, aby chronić twoje konto, o czym Pan wie." },
    { found: ["te"], locale: "pt-BR", text: "Uma vez, e depois os vendedores te cobram." },
    { found: ["Твоя", "Ваш"], locale: "uk-UA", text: "Твоя команда готова, і Ваш ключ теж." },
  ] as const)("finds $found in $locale text", ({ found, locale, text }) => {
    expect(formOfAddressProblems({ locale, text })).toEqual(found.map((word) => problem(locale, word)))
  })

  it.each([
    { locale: "de-DE", text: "Sie laufen im Worker. Ihre Werte stammen aus dem Code, und sie bleiben gleich, wie ihr Autor sie schrieb." },
    { locale: "de-DE", text: "## Was die Bereiche hinzufügen\n\nSie deklarieren ihre Routen selbst." },
    { locale: "fr-FR", text: "Le ton du texte reste neutre, et vous pouvez le changer." },
    { locale: "es-ES", text: "La CLI escribe su configuración y tú decides qué conservar." },
    { locale: "it-IT", text: "Lei ha scritto il codice. Non vi è nulla da rimborsare." },
    { locale: "ja-JP", text: "誰もが「これは契約だ。」と言います。型は契約です。" },
    { locale: "pl-PL", text: "Twoje konto jest bezpieczne, a ci użytkownicy też, jak każde państwo członkowskie." },
    { locale: "pt-BR", text: "A equipe de TI configura o seu projeto para você." },
    { locale: "uk-UA", text: "## Що купує один платіж\n\nВи купуєте не код. Вам не потрібні інструменти." },
    { locale: "fr-FR", text: "Voir https://example.com/tu/te et [le guide](/docs/ta) pour vous." },
    { locale: "en-US", text: "Read the documentation before you pay." },
  ] as const)("passes the $locale text that addresses the reader its own way", ({ locale, text }) => {
    expect(formOfAddressProblems({ locale, text })).toEqual([])
  })
})
