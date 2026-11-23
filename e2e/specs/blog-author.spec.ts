import { globSync, readFileSync } from "node:fs"
import { basename, join } from "node:path"

import * as zod from "zod"

import pagesBlog from "../../messages/en-US/pages.blog.json" with { type: "json" }
import plPagesBlog from "../../messages/pl-PL/pages.blog.json" with { type: "json" }
import { BLOG_AUTHOR, BLOG_AUTHORS, blogAuthorPath } from "../../src/data/blog"
import { I18N } from "../../src/integrations/use-intl/i18n.config"
import { HTTP_STATUS } from "../../src/modules/_core/constants/api"
import { readPageHead } from "../../src/lib/page-head"
import { APP_URL } from "../../src/presentation/branding"
import * as ROUTES from "../../src/routes"
import { expect, test } from "../fixtures/test"

const CLIENT_DIR = "dist/client"
const AUTHOR = BLOG_AUTHOR.PIOTR_BOROWIECKI
const { name, profiles } = BLOG_AUTHORS[AUTHOR]
const AUTHOR_PAGE = blogAuthorPath(AUTHOR)
const POST = `${ROUTES.BLOG}/${basename(globSync("content/blog/*.en-US.mdx").toSorted()[0] ?? "", ".en-US.mdx")}`
const STRUCTURED_DATA = /<script type="application\/ld\+json">(?<json>.*?)<\/script>/gu
const MARKUP = /<[^>]*>/gu
const EMPLOYER = /\bIBM\b/u

const graphSchema = zod.object({ "@graph": zod.array(zod.record(zod.string(), zod.unknown())) })

const graphNodes = (html: string) =>
  Array.from(html.matchAll(STRUCTURED_DATA), ({ groups }) => JSON.parse(groups?.["json"] ?? "{}")).flatMap((data: unknown) => {
    const parsed = graphSchema.safeParse(data)

    return parsed.success ? parsed.data["@graph"] : []
  })

test("follows the byline at the end of a post to the author page, which lists the post", async ({ page }) => {
  await page.goto(POST)
  const title = await page.getByRole("heading", { level: 1 }).textContent()

  await page.getByRole("link", { exact: true, name }).click()

  await expect(page).toHaveURL(AUTHOR_PAGE)
  await expect(page.getByRole("heading", { level: 1, name })).toBeVisible()
  await expect(page.getByText(pagesBlog.authors[AUTHOR].bio)).toBeVisible()
  await expect(page.getByRole("link", { exact: true, name: title ?? "" })).toHaveAttribute("href", POST)
  await expect(page.getByText(pagesBlog.author.disclaimer)).toBeVisible()
  for (const { network, url } of profiles) {
    await expect(page.getByRole("link", { name: pagesBlog.author.profiles[network].replace("{name}", name) })).toHaveAttribute("href", url)
  }
})

test("keeps the language from a Polish post to the Polish author page", async ({ page }) => {
  await page.goto(`/pl-PL${POST}`)

  await page.getByRole("link", { exact: true, name }).click()

  await expect(page).toHaveURL(`/pl-PL${AUTHOR_PAGE}`)
  await expect(page.getByText(plPagesBlog.authors[AUTHOR].role)).toBeVisible()
})

test("prerenders the author page in every language with its canonical address and alternates", async ({ request }) => {
  const response = await request.get(`/ja-JP${AUTHOR_PAGE}`)
  const head = readPageHead(await response.text())

  expect(response.status()).toBe(HTTP_STATUS.OK)
  expect(head.canonical).toBe(`${APP_URL}/ja-JP${AUTHOR_PAGE}`)
  expect(head.alternates.map(({ hreflang }) => hreflang)).toStrictEqual(expect.arrayContaining([...I18N.SUPPORTED_LOCALES]))
})

test("describes the author of a post as a Person that the author page describes as its ProfilePage", async ({ request }) => {
  const [post, profile] = await Promise.all([request.get(POST), request.get(AUTHOR_PAGE)])
  const postNodes = graphNodes(await post.text())
  const profileNodes = graphNodes(await profile.text())
  const person = postNodes.find((node) => node["@type"] === "Person")

  expect(person).toMatchObject({
    "@id": `${APP_URL}${AUTHOR_PAGE}#person`,
    jobTitle: pagesBlog.authors[AUTHOR].role,
    name,
    sameAs: profiles.map(({ url }) => url),
    url: `${APP_URL}${AUTHOR_PAGE}`,
  })
  expect(postNodes.find((node) => node["@type"] === "BlogPosting")?.["author"]).toStrictEqual({ "@id": person?.["@id"] })
  expect(profileNodes.find((node) => node["@type"] === "ProfilePage")?.["mainEntity"]).toStrictEqual({ "@id": person?.["@id"] })
  expect(profileNodes.find((node) => node["@type"] === "Person")).toStrictEqual(person)
})

test("names no employer of the author on any rendered page or in any message", () => {
  const pages = globSync("**/*.html", { cwd: CLIENT_DIR }).map((file) => [file, readFileSync(join(CLIENT_DIR, file), "utf8").replaceAll(MARKUP, " ")])
  const messages = globSync("messages/**/*.json").map((file) => [file, readFileSync(file, "utf8")])

  expect(pages.length).toBeGreaterThan(0)
  expect([...pages, ...messages].filter(([, text]) => EMPLOYER.test(text ?? "")).map(([file]) => file)).toStrictEqual([])
})
