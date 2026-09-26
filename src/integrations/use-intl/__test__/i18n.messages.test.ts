import { readFileSync, readdirSync } from "node:fs"
import { resolve } from "node:path"
import { describe, expect, it } from "vite-plus/test"
import * as zod from "zod"

import { I18N } from "~/src/integrations/use-intl/i18n.config"
import { loadNamespace, loadPageMetadata, toNamespace } from "~/src/integrations/use-intl/i18n.messages"

const MESSAGES_DIRECTORY = resolve("messages")
const STORED_MESSAGES_SCHEMA = zod.record(zod.string(), zod.unknown())

const readStoredMessages = (locale: string, file: string) => {
  const stored = readFileSync(resolve(MESSAGES_DIRECTORY, locale, file), "utf8")
  return STORED_MESSAGES_SCHEMA.parse(JSON.parse(stored))
}

describe("message namespace loading", () => {
  it.each(I18N.SUPPORTED_LOCALES)("loads every %s namespace and its page metadata exactly as stored", async (locale) => {
    const files = readdirSync(resolve(MESSAGES_DIRECTORY, locale))
    expect(files).toStrictEqual(readdirSync(resolve(MESSAGES_DIRECTORY, I18N.DEFAULT_LOCALE)))

    for (const file of files) {
      const namespace = toNamespace(file)
      const stored = readStoredMessages(locale, file)
      await expect(loadNamespace({ locale, namespace })).resolves.toStrictEqual(stored)
      await expect(loadPageMetadata({ locale, namespace })).resolves.toStrictEqual(stored["metadata"])
    }
  })

  it("names the missing file when page metadata is requested for an undeclared namespace", () => {
    expect(() => loadPageMetadata({ locale: "pl-PL", namespace: "pages.missing" })).toThrow(
      "No messages/pl-PL/pages.missing.json — every declared namespace needs a file per supported locale.",
    )
  })
})
