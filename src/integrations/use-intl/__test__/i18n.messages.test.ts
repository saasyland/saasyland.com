import { readFileSync, readdirSync } from "node:fs"
import { resolve } from "node:path"
import { createTranslator } from "use-intl"
import { describe, expect, it } from "vite-plus/test"
import zod from "zod/v4"

import { I18N } from "~/src/integrations/use-intl/i18n.config"
import { loadNamespace, loadPageMetadata, toNamespace } from "~/src/integrations/use-intl/i18n.messages"

import { APP_NAME } from "~/src/presentation/branding"

const MESSAGES_DIRECTORY = resolve("messages")
const STORED_MESSAGES_SCHEMA = zod.record(zod.string(), zod.unknown())
const PAGE_METADATA_SCHEMA = zod.object({ description: zod.string(), title: zod.string() })
const PRICE = "$1"

const readStoredMessages = (locale: string, file: string) => {
  const stored = readFileSync(resolve(MESSAGES_DIRECTORY, locale, file), "utf8")
  return STORED_MESSAGES_SCHEMA.parse(JSON.parse(stored))
}

describe("message namespace loading", () => {
  it.each(I18N.SUPPORTED_LOCALES)("loads every %s namespace exactly as stored and the page metadata it formats", async (locale) => {
    const files = readdirSync(resolve(MESSAGES_DIRECTORY, locale))
    expect(files).toStrictEqual(readdirSync(resolve(MESSAGES_DIRECTORY, I18N.DEFAULT_LOCALE)))

    for (const file of files) {
      const namespace = toNamespace(file)
      const stored = readStoredMessages(locale, file)
      await expect(loadNamespace({ locale, namespace })).resolves.toStrictEqual(stored)
      const metadata = PAGE_METADATA_SCHEMA.safeParse(stored["metadata"])
      const loaded = loadPageMetadata({ locale, namespace, values: { price: PRICE } })
      if (metadata.success) {
        const t = createTranslator({ locale, messages: metadata.data })
        await expect(loaded).resolves.toStrictEqual({
          description: t("description", { appName: APP_NAME, price: PRICE }),
          title: t("title", { appName: APP_NAME, price: PRICE }),
        })
      } else {
        await expect(loaded).rejects.toThrow(`messages/${locale}/${namespace}.json has no page metadata`)
      }
    }
  })

  it("names the missing file when page metadata is requested for an undeclared namespace", async () => {
    await expect(loadPageMetadata({ locale: "pl-PL", namespace: "pages.missing" })).rejects.toThrow(
      "No messages/pl-PL/pages.missing.json — every declared namespace needs a file per supported locale.",
    )
  })
})
