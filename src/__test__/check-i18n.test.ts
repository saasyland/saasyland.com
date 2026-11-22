import { describe, expect, it } from "vite-plus/test"

import { emptyKeyUsage, isUsedKey, recordContractNames, recordSourceUsage } from "~/scripts/check-i18n"

const usageOf = (sources: readonly string[], contract: readonly unknown[] = []) => {
  const usage = emptyKeyUsage()

  for (const source of sources) {
    recordSourceUsage(source, usage)
  }

  recordContractNames(contract, usage)

  return usage
}

const PLACEHOLDER = "$"

const USER_TABS = [
  `const t = useTranslations()\nreturn t(\`navigation.${PLACEHOLDER}{tab.area}.userTabs.${PLACEHOLDER}{tab.key}\`)`,
  'export const TABS = [{ area: "auth", key: "allUsers" }]',
]

describe("isUsedKey", () => {
  it("counts a key that a t() call names, with the keys below it", () => {
    const usage = usageOf(['const t = useTranslations("pages.license")\nt("copy")\nt.raw("steps")'])

    expect(isUsedKey("pages.license.copy", usage)).toBe(true)
    expect(isUsedKey("pages.license.steps.first", usage)).toBe(true)
    expect(isUsedKey("pages.license.copyKey", usage)).toBe(false)
  })

  it("fills a template's placeholders only with names the source declares", () => {
    const usage = usageOf(USER_TABS)

    expect(isUsedKey("navigation.auth.userTabs.allUsers", usage)).toBe(true)
    expect(isUsedKey("navigation.team.userTabs.invitations", usage)).toBe(false)
    expect(isUsedKey("navigation.auth.breadcrumbs.allUsers", usage)).toBe(false)
  })

  it("reads the names that the CLI contract declares", () => {
    const usage = usageOf(
      [`const t = useTranslations("platforms")\nt(\`${PLACEHOLDER}{machine.platform}\`)`],
      [{ PLATFORM: { MAC: "darwin" } }, 0],
    )

    expect(isUsedKey("platforms.darwin", usage)).toBe(true)
    expect(isUsedKey("platforms.beos", usage)).toBe(false)
  })

  it("counts a key below a variable t() call only when the name, or a namespace and a name, spell its whole path", () => {
    const usage = usageOf([
      "const t = useTranslations(namespace)\nreturn t(message)",
      '<ValidationFieldError namespace="auth.validations" />',
      'zod.email({ message: "emailInvalid" })',
      'const FILTERS = ["status"]',
    ])

    expect(isUsedKey("auth.validations.emailInvalid", usage)).toBe(true)
    expect(isUsedKey("status", usage)).toBe(true)
    expect(isUsedKey("pages.admin.products.filters.status", usage)).toBe(false)
  })

  it("exempts the catalogues and every page's metadata", () => {
    const usage = usageOf([])

    expect(isUsedKey("countries.PL", usage)).toBe(true)
    expect(isUsedKey("pages.blog.metadata.title", usage)).toBe(true)
    expect(isUsedKey("pages.blog.title", usage)).toBe(false)
  })
})
