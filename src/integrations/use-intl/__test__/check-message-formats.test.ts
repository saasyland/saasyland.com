import { describe, expect, it } from "vite-plus/test"

import { messageFormatProblems, messageProblems } from "~/scripts/check-message-formats"

const TRANSLATIONS_CHECK = "Every string lives in messages/en-US, checked by bun run check:i18n"
const INTEGRATION_SOURCE = "src/integrations/use-intl, loaded on demand"

describe("check-message-formats", () => {
  it("finds no problem in any message of any locale", () => {
    expect(messageFormatProblems()).toEqual([])
  })

  it.each([
    {
      changed: ["messages/en-US"],
      locale: "de-DE",
      original: TRANSLATIONS_CHECK,
      value: "Jeder Text liegt in nachrichten/en-US, geprüft durch bun run check:i18n",
    },
    {
      changed: ["messages/en-US", "bun run check:i18n"],
      locale: "it-IT",
      original: TRANSLATIONS_CHECK,
      value: "Ogni testo si trova in messaggi/en-US, verificato da bun run controllo:i18n",
    },
    {
      changed: ["bun run check:i18n"],
      locale: "ja-JP",
      original: TRANSLATIONS_CHECK,
      value: "すべての文字列はmessages/en-USにあり、bun run チェックで検証されます",
    },
    {
      changed: ["src/integrations/use-intl"],
      locale: "fr-FR",
      original: INTEGRATION_SOURCE,
      value: "src/intégrations/use-intl, chargé à la demande",
    },
    {
      changed: ["src/integrations/use-intl"],
      locale: "pt-BR",
      original: INTEGRATION_SOURCE,
      value: "src/integrações/use-intl, carregado sob demanda",
    },
  ] as const)("fails the $locale translation that changed a path or a command", ({ changed, locale, original, value }) => {
    expect(messageProblems({ locale, original, value })).toEqual(changed.map((code) => `changed the path or command ${code}`))
  })

  it("passes a translation whose paths and commands are ICU arguments", () => {
    expect(
      messageProblems({
        locale: "it-IT",
        original: "Every string lives in {messagesPath}, checked by {i18nCheckCommand}",
        value: "Ogni testo si trova in {messagesPath}, verificato da {i18nCheckCommand}",
      }),
    ).toEqual([])
  })

  it("fails Markdown backticks in a translation of plain text", () => {
    expect(
      messageProblems({ locale: "es-ES", original: "Loaded on demand, not bundled", value: "Cargado bajo demanda, no `bundled`" }),
    ).toEqual(["unexpected Markdown code"])
  })
})
