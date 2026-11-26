import { describe, expect, it } from "vite-plus/test"

import { isUsedKey, missingKeys, recordContractNames } from "~/scripts/check-i18n"
import { analyzeTranslations } from "~/scripts/translation-usage"

const usageOf = (sources: Readonly<Record<string, string>>, contract: readonly unknown[] = []) => {
  const usage = analyzeTranslations(Object.keys(sources), (file) => sources[file] ?? "")

  recordContractNames(contract, usage)

  return usage
}

const PLACEHOLDER = "$"

const USE_TRANSLATIONS = 'import { useTranslations } from "use-intl/react"'

describe("isUsedKey", () => {
  it("counts the key a call spells, and the keys below it only for t.raw", () => {
    const usage = usageOf({
      "src/license.tsx": `${USE_TRANSLATIONS}
export const License = () => {
  const t = useTranslations("pages.license")
  return [t("copy"), t.raw("steps")]
}`,
    })

    expect(isUsedKey("pages.license.copy", usage)).toBe(true)
    expect(isUsedKey("pages.license.copy.short", usage)).toBe(false)
    expect(isUsedKey("pages.license.steps.first", usage)).toBe(true)
    expect(isUsedKey("pages.license.copyKey", usage)).toBe(false)
  })

  it("fills a template's placeholders with declared names and counts only the keys it spells", () => {
    const usage = usageOf({
      "src/other.tsx": 'export const Other = () => {\n  const label = "legacy"\n  return label\n}',
      "src/pricing.tsx": `${USE_TRANSLATIONS}
import type { Tier } from "~/src/tiers"
export const TierName = ({ tier }: { tier: Tier }) => {
  const tTier = useTranslations("pricing")
  return tTier(\`tiers.${PLACEHOLDER}{tier}.name\`)
}`,
      "src/tiers.ts": 'export const TIERS = { CORE: "core", PRO: "pro" } as const\nexport type Tier = (typeof TIERS)[keyof typeof TIERS]',
    })

    expect(isUsedKey("pricing.tiers.core.name", usage)).toBe(true)
    expect(isUsedKey("pricing.tiers.pro.name", usage)).toBe(true)
    expect(isUsedKey("pricing.tiers.core.name.short", usage)).toBe(false)
    expect(isUsedKey("pricing.tiers.legacy.name", usage)).toBe(false)
  })

  it("resolves keys and namespaces through constants, imports, re-exports and Promise.all", () => {
    const usage = usageOf({
      "src/load.ts": "export const loadNamespace = (options: unknown) => options",
      "src/names.ts": 'export { STEPS_NAMESPACE } from "./namespace"',
      "src/namespace.ts": 'export const STEPS_NAMESPACE = "emails.steps"',
      "src/send.ts": `import { createTranslator } from "use-intl"
import { loadNamespace } from "~/src/load"
import { STEPS_NAMESPACE } from "~/src/names"
export const send = async (done: boolean) => {
  const [messages] = await Promise.all([loadNamespace({ namespace: STEPS_NAMESPACE })])
  const key = \`status.${PLACEHOLDER}{done ? "done" : "open"}\`
  return createTranslator({ messages })(key)
}`,
    })

    expect(isUsedKey("emails.steps.status.done", usage)).toBe(true)
    expect(isUsedKey("emails.steps.status.open", usage)).toBe(true)
    expect(isUsedKey("emails.steps.status.closed", usage)).toBe(false)
  })

  it("proves a key without a static namespace only from a namespace the calling file names", () => {
    const usage = usageOf({
      "src/errors.ts": 'export const ERROR_CODES = { NOT_FOUND: "NOT_FOUND" } as const',
      "src/routes.ts": 'export const NAMESPACES = ["pages.blog"] as const\nexport const ROWS = ["headStart"] as const',
      "src/use-error-message.ts": `${USE_TRANSLATIONS}
import { ERROR_CODES } from "~/src/errors"
const NAMESPACES = new Map(Object.values(ERROR_CODES).map((code) => [code, "errors.codes"]))
export const useErrorMessage = () => {
  const t = useTranslations()
  return (message: string) => t(\`${PLACEHOLDER}{NAMESPACES.get(message)}.${PLACEHOLDER}{message}\`)
}`,
    })

    expect(isUsedKey("errors.codes.NOT_FOUND", usage)).toBe(true)
    expect(isUsedKey("pages.blog.headStart", usage)).toBe(false)
  })

  it("takes the namespaces a component receives as JSX attributes and the messages of Zod issues", () => {
    const usage = usageOf({
      "src/field-error.tsx": `${USE_TRANSLATIONS}
export const FieldError = ({ message, namespace }: { message: string; namespace: string }) => {
  const t = useTranslations()
  const key = \`${PLACEHOLDER}{namespace}.${PLACEHOLDER}{message}\`
  return t.has(key) && t(key)
}`,
      "src/form.tsx": `import * as zod from "zod"
import { FieldError } from "~/src/field-error"
const schema = zod.email({ message: "emailInvalid" }).superRefine((value, context) => {
  context.addIssue({ code: "custom", message: "emailTaken" })
})
export const Form = ({ error }: { error: string }) => <FieldError message={error} namespace="auth.validations" />`,
    })

    expect(isUsedKey("auth.validations.emailInvalid", usage)).toBe(true)
    expect(isUsedKey("auth.validations.emailTaken", usage)).toBe(true)
    expect(isUsedKey("auth.validations.passwordShort", usage)).toBe(false)
  })

  it("counts a key in a variable when one declared name spells it whole, never a word of an unrelated list", () => {
    const usage = usageOf({
      "src/glossary.ts": 'export const GLOSSARY = [{ term: "landing" }, { term: "pages" }] as const',
      "src/navigation.ts": 'export const MENU = [{ label: "navigation.users" }] as const',
      "src/sidebar.tsx": `${USE_TRANSLATIONS}
import { useMemo } from "react"
import { MENU } from "~/src/navigation"
export const Sidebar = () => {
  const t = useTranslations()
  return useMemo(() => MENU.map((item) => t(item.label)), [t])
}`,
    })

    expect(isUsedKey("navigation.users", usage)).toBe(true)
    expect(isUsedKey("pages.landing.title", usage)).toBe(false)
  })

  it("reads the names that the CLI contract declares", () => {
    const usage = usageOf(
      {
        "src/machine.tsx": `${USE_TRANSLATIONS}
export const Platform = ({ machine }: { machine: { platform: string } }) => {
  const t = useTranslations("platforms")
  return t(\`${PLACEHOLDER}{machine.platform}\`)
}`,
      },
      [{ PLATFORM: { MAC: "darwin" } }, 0],
    )

    expect(isUsedKey("platforms.darwin", usage)).toBe(true)
    expect(isUsedKey("platforms.beos", usage)).toBe(false)
  })

  it("exempts the catalogues and every page's metadata", () => {
    const usage = usageOf({})

    expect(isUsedKey("countries.PL", usage)).toBe(true)
    expect(isUsedKey("pages.blog.metadata.title", usage)).toBe(true)
    expect(isUsedKey("pages.blog.title", usage)).toBe(false)
  })
})

describe("missingKeys", () => {
  it("lists a static key that does not resolve in its translator's namespace, but not a key it only checks", () => {
    const usage = usageOf({
      "src/page.tsx": `${USE_TRANSLATIONS}
import { createTranslator } from "use-intl"
export const Page = () => {
  const t = useTranslations("pages")
  const text = createTranslator({ locale: "en-US", messages: { text: "Text" } })("text")
  return t.has("absent") && [t("title"), t("missing"), text]
}`,
    })

    expect(missingKeys(usage, { pages: { title: "Title" } })).toEqual(["  src/page.tsx:6: pages.missing"])
  })
})
