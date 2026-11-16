import { readFileSync } from "node:fs"
import { describe, expect, it } from "vite-plus/test"

import { mdxProblems, pageProblems, pullRequestEntryProblems, sourcePages } from "~/scripts/check-content"

const API_SURFACE = "content/docs/features/api-surface"
const API_SURFACE_LABEL = "docs/features/api-surface.pl-PL.mdx"
const CLI_API_ROW = 'name="cliApiBasePath"'
const EXAMPLE_LABEL = "docs/example.de-DE.mdx"
const JAPANESE_LABEL = "docs/example.ja-JP.mdx"
const MERGED_PULL_REQUEST = "201"
const ENTRY_LABEL = "changelog/202.de-DE.mdx"
const ENGLISH_ENTRY = "- Fixed: the checkout keeps the buyer's email address when they return from Polar.\n"

const readApiSurface = (locale: string): string => readFileSync(`${API_SURFACE}.${locale}.mdx`, "utf8")

const page = (body: string): string => `---\ntitle: "Page"\n---\n\n${body}\n`

const problemsOf = ({ source, target }: { source: string; target: string }): string[] =>
  mdxProblems({ label: EXAMPLE_LABEL, locale: "de-DE", source: page(source), target: page(target) })

describe("check-content", () => {
  it("checks every English docs page, blog post, changelog entry and navigation file", () => {
    expect(sourcePages()).toEqual(
      expect.arrayContaining([
        "blog/ai-coding-agents-repository-readiness.en-US.mdx",
        `changelog/${MERGED_PULL_REQUEST}.en-US.mdx`,
        "docs/index.en-US.mdx",
        "docs/meta.en-US.json",
      ]),
    )
  })

  it.each(sourcePages())("finds no drift between %s and its translations", (sourcePage) => {
    expect(pageProblems(sourcePage)).toEqual([])
  })

  it("fails a translation that lost the CLI licence API row, as pl-PL and pt-BR had", () => {
    const target = readApiSurface("pl-PL")
      .split("\n")
      .filter((line) => !line.includes(CLI_API_ROW))
      .join("\n")

    expect(mdxProblems({ label: API_SURFACE_LABEL, locale: "pl-PL", source: readApiSurface("en-US"), target })).toEqual([
      `${API_SURFACE_LABEL} leaves out \`/*\` from the English page`,
      `${API_SURFACE_LABEL} leaves out \`licenseApiHandlers\` from the English page`,
      `${API_SURFACE_LABEL} leaves out \`license.api.ts\` from the English page`,
      `${API_SURFACE_LABEL} leaves out \`saasyland\` from the English page`,
      `${API_SURFACE_LABEL} leaves out <RepositoryFact name="cliApiBasePath"> from the English page`,
      `${API_SURFACE_LABEL} has 5 table rows where the English page has 6`,
    ])
  })

  it("fails inline code that a translation changes or adds", () => {
    expect(
      problemsOf({
        source: "Spread `timestamps()` and await `flushWaitUntil()`.",
        target: "Rufen Sie `...timestamps()` auf und warten Sie mit `await` auf `flushWaitUntil()`.",
      }),
    ).toEqual([
      `${EXAMPLE_LABEL} leaves out \`timestamps()\` from the English page`,
      `${EXAMPLE_LABEL} adds \`...timestamps()\`, which the English page does not have`,
      `${EXAMPLE_LABEL} adds \`await\`, which the English page does not have`,
    ])
  })

  it("compares the props a page keeps and ignores the titles it translates", () => {
    expect(
      problemsOf({
        source: '<Card title="Guides" href="/docs/guides" />\n\nCore costs <TierPrice tier="core" />.',
        target: '<Card title="Anleitungen" href="/docs/guides" />\n\nCore kostet <TierPrice tier="agency" />.',
      }),
    ).toEqual([
      `${EXAMPLE_LABEL} leaves out <TierPrice tier="core"> from the English page`,
      `${EXAMPLE_LABEL} adds <TierPrice tier="agency">, which the English page does not have`,
    ])
  })

  it("compares the pages a translation links to, whatever their translated anchors", () => {
    expect(
      problemsOf({
        source: "See [Loading skeletons](/docs/architecture/delivery-layer#loading-skeletons) and [Routes](#routes).",
        target: "Siehe [Lade-Skeletons](/docs/architecture/delivery-layer#lade-skeletons) und [Routen](#routen).",
      }),
    ).toEqual([])
    expect(problemsOf({ source: "See [Routes](/docs/reference/routes).", target: "Siehe Routen." })).toEqual([
      `${EXAMPLE_LABEL} leaves out /docs/reference/routes from the English page`,
    ])
  })

  it.each([
    ["[pricing](/pl-PL/#pricing)", "/pl-PL/", "/"],
    ["[docs](/docs/#install)", "/docs/", "/docs"],
    ["[blog](/blog/?page=2)", "/blog/", "/blog"],
    ['<Card title="Guides" href="/docs/guides/" />', "/docs/guides/", "/docs/guides"],
    ["[about](/docs/index)", "/docs/index", "/docs"],
    ["[home](/index.html)", "/index.html", "/"],
    ["[docs](/docs.html)", "/docs.html", "/docs"],
    ["[docs](/en-US/docs)", "/en-US/docs", "/docs"],
    ["[docs](/pl/docs)", "/pl/docs", "/docs"],
    ["[docs](/de-DE/docs)", "/de-DE/docs", "/docs"],
  ])("fails %s, which links to %s instead of %s", (link, path, canonical) => {
    expect(mdxProblems({ label: EXAMPLE_LABEL, locale: "de-DE", source: page(link), target: page(link) })).toContain(
      `${EXAMPLE_LABEL} links to ${path} instead of ${canonical}, which the site serves without a redirect in the reader's locale`,
    )
  })

  it("passes internal links in their canonical form and leaves external links and code alone", () => {
    expect(
      problemsOf({
        source:
          "See [pricing](/#pricing), [home](/), [docs](/docs?tab=cli#install), [feed](/feed.xml), [site](https://example.com/docs/) and `[x](/docs/)`.",
        target:
          "Siehe [Preise](/#pricing), [Start](/), [Doku](/docs?tab=cli#install), [Feed](/feed.xml), [Seite](https://example.com/docs/) und `[x](/docs/)`.",
      }),
    ).toEqual([])
  })

  it("checks a changelog entry without asking it for a title, and keeps its English out of the translations", () => {
    expect(
      mdxProblems({
        label: ENTRY_LABEL,
        locale: "de-DE",
        source: ENGLISH_ENTRY,
        target: "- Behoben: Der Checkout behält die E-Mail-Adresse.\n",
      }),
    ).toEqual([])
    expect(mdxProblems({ label: ENTRY_LABEL, locale: "de-DE", source: ENGLISH_ENTRY, target: ENGLISH_ENTRY })).toEqual([
      `Untranslated English paragraph in ${ENTRY_LABEL}`,
    ])
  })

  it.each(["changelog/latest.de-DE.mdx", "changelog/0b9a1b986.de-DE.mdx"])("fails %s, which no merge can date", (label) => {
    expect(mdxProblems({ label, locale: "de-DE", source: ENGLISH_ENTRY, target: "- Behoben.\n" })).toEqual([
      `${label} is named after neither a pull request number nor a full commit hash`,
    ])
  })

  it("fails a bare URL that runs into the text after it, as the Japanese preview deploy page's did", () => {
    const sentence = "ホスト（https://preview.saasyland.com）が応答することを確認します。"

    expect(mdxProblems({ label: JAPANESE_LABEL, locale: "ja-JP", source: page(sentence), target: page(sentence) })).toEqual([
      `${JAPANESE_LABEL} has a bare URL that runs into the text after it, so the link takes that text too: https://preview.saasyland.com）が応答することを確認します。`,
    ])
  })

  it.each([
    "ホスト（`https://preview.saasyland.com`）が応答します。",
    "ホスト（[プレビュー](https://preview.saasyland.com)）が応答します。",
    "ホスト (https://preview.saasyland.com) が応答します。",
    'ホスト<a href="https://preview.saasyland.com">プレビュー</a>が応答します。',
  ])("passes a URL that ends where the link should: %s", (sentence) => {
    expect(mdxProblems({ label: JAPANESE_LABEL, locale: "ja-JP", source: page(sentence), target: page(sentence) })).toEqual([])
  })

  it("lets a translation translate the heading of the changes not on main yet", () => {
    expect(
      problemsOf({ source: '<ChangelogEntries unreleased="Unreleased" />', target: '<ChangelogEntries unreleased="Unveröffentlicht" />' }),
    ).toEqual([])
  })
})

describe("pullRequestEntryProblems", () => {
  it("passes a pull request that adds its changelog entry, and a run that is not for a pull request", () => {
    expect(pullRequestEntryProblems(`refs/pull/${MERGED_PULL_REQUEST}/merge`)).toEqual([])
    expect(pullRequestEntryProblems("refs/heads/main")).toEqual([])
  })

  it("fails a pull request without its changelog entry", () => {
    expect(pullRequestEntryProblems("refs/pull/99999/merge")).toEqual([
      "Pull request #99999 has no changelog entry: add content/changelog/99999.<locale>.mdx in every locale",
    ])
  })
})
