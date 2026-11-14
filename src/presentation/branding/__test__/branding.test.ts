import { readFileSync } from "node:fs"
import { expect, it } from "vite-plus/test"

import { APP_DOMAIN, APP_GITHUB_URL, APP_URL, CONTACT_EMAIL } from "~/src/presentation/branding"

const FILES_WITH_CONTACT = ["CODE_OF_CONDUCT.md", "SECURITY.md", "SUPPORT.md", ".github/ISSUE_TEMPLATE/config.yml"]
const FILES_WITH_REPOSITORY_LINKS = ["CONTRIBUTING.md", "SECURITY.md", "SUPPORT.md", ".github/ISSUE_TEMPLATE/config.yml"]

const EMAIL_ADDRESS = /[\w.+-]+@[\w-]+(?:\.[\w-]+)+/gu
const GITHUB_URL = /https:\/\/github\.com\/[^\s)]+/gu

const matches = (file: string, pattern: RegExp): string[] => Array.from(readFileSync(file, "utf8").matchAll(pattern), ([match]) => match)

it("derives the application URL from the application domain", () => {
  expect(APP_URL).toBe(`https://${APP_DOMAIN}`)
})

it.each(FILES_WITH_CONTACT)("names CONTACT_EMAIL as the contact in %s", (file) => {
  expect(new Set(matches(file, EMAIL_ADDRESS))).toEqual(new Set([CONTACT_EMAIL]))
})

it.each(FILES_WITH_REPOSITORY_LINKS)("links %s to APP_GITHUB_URL", (file) => {
  expect(matches(file, GITHUB_URL).filter((url) => !url.startsWith(`${APP_GITHUB_URL}/`))).toEqual([])
})
