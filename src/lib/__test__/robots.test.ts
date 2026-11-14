import { readFileSync } from "node:fs"
import { describe, expect, it } from "vite-plus/test"

import { isAllowedByRobots, parseRobotsRules } from "~/src/lib/robots"
import { SITEMAP_PATH } from "~/src/lib/seo"

import { APP_URL } from "~/src/presentation/branding"

const ROBOTS_TXT = [
  "User-agent: Googlebot",
  "Disallow: /",
  "",
  "User-agent: *",
  "User-agent: Bingbot",
  "Disallow: /api/ # endpoints",
  "Allow: /api/public",
  "Disallow:",
].join("\r\n")

describe("parseRobotsRules", () => {
  it("keeps the rules of every group that names the wildcard agent and drops empty rules", () => {
    expect(parseRobotsRules(ROBOTS_TXT)).toStrictEqual([
      { allow: false, path: "/api/" },
      { allow: true, path: "/api/public" },
    ])
  })

  it("ignores rules that come before any user agent and lines that are not directives", () => {
    expect(parseRobotsRules("Disallow: /\nSitemap: https://example.com/sitemap.xml\nuser-agent: *\nDISALLOW: /private")).toStrictEqual([
      { allow: false, path: "/private" },
    ])
  })

  it("starts a new group when a user agent follows rules", () => {
    expect(parseRobotsRules("User-agent: *\nDisallow: /a\nUser-agent: Googlebot\nDisallow: /b")).toStrictEqual([
      { allow: false, path: "/a" },
    ])
  })
})

describe("isAllowedByRobots", () => {
  const rules = parseRobotsRules(
    ["User-agent: *", "Disallow: /docs/", "Allow: /docs/public", "Disallow: /*.pdf$", "Allow: /fair", "Disallow: /fair"].join("\n"),
  )

  it.each([
    ["/", true],
    ["/docs", true],
    ["/docs/private", false],
    ["/docs/public/page", true],
    ["/files/guide.pdf", false],
    ["/files/guide.pdf.html", true],
    ["/fair", true],
  ])("answers %s with %s, the longest matching rule winning and Allow winning a tie", (pathname, allowed) => {
    expect(isAllowedByRobots(rules, pathname)).toBe(allowed)
  })

  it.each([
    [["Disallow: /tie", "Allow: /tie"], "/tie", true],
    [["Allow: /docs/public", "Disallow: /docs/"], "/docs/public", true],
    [["Disallow: /docs/public", "Allow: /docs/"], "/docs/public", false],
  ])("lets the most specific rule win in whichever order %j lists it", (lines, pathname, allowed) => {
    const robotsTxt = ["User-agent: *", ...lines].join("\n")

    expect(isAllowedByRobots(parseRobotsRules(robotsTxt), pathname)).toBe(allowed)
  })

  it("treats regular expression characters in a rule as literal text", () => {
    expect(isAllowedByRobots(parseRobotsRules("User-agent: *\nDisallow: /a.b(c)"), "/axb(c)")).toBe(true)
    expect(isAllowedByRobots(parseRobotsRules("User-agent: *\nDisallow: /a.b(c)"), "/a.b(c)")).toBe(false)
  })
})

it("points crawlers to the sitemap and lets them read the whole site", () => {
  const robotsTxt = readFileSync("public/robots.txt", "utf8")

  expect(robotsTxt).toContain(`Sitemap: ${APP_URL}${SITEMAP_PATH}\n`)
  expect(parseRobotsRules(robotsTxt).filter(({ allow }) => !allow)).toStrictEqual([])
})
