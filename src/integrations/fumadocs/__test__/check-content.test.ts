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
const POST_LABEL = "blog/example.de-DE.mdx"
const ENGLISH_ENTRY = "- Fixed: the checkout keeps the buyer's email address when they return from Polar.\n"

const readApiSurface = (locale: string): string => readFileSync(`${API_SURFACE}.${locale}.mdx`, "utf8")

const page = (body: string): string => `---\ntitle: "Page"\n---\n\n${body}\n`

const post = (dates: Readonly<Record<string, string>>): string =>
  `---\ntitle: "Post"\n${Object.entries(dates)
    .map(([field, value]) => `${field}: ${value}\n`)
    .join("")}---\n\nBody.\n`

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
      `${API_SURFACE_LABEL} has 4 table rows where the English page has 5`,
    ])
  })

  it("fails inline code that a translation changes or adds", () => {
    expect(
      problemsOf({
        source: "Spread `timestamps()` and await `flushWaitUntil()`.",
        target: "Rufe `...timestamps()` auf und warte mit `await` auf `flushWaitUntil()`.",
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

  it.each(["Behoben: Der Checkout behält die E-Mail-Adresse.\n", "- Behoben: Der Checkout\n  behält die E-Mail-Adresse.\n"])(
    "fails a changelog entry that is not a list of one-line bullets: %j",
    (target) => {
      expect(mdxProblems({ label: ENTRY_LABEL, locale: "de-DE", source: ENGLISH_ENTRY, target })).toEqual([
        `${ENTRY_LABEL} must be a list of one-line bullets, each starting with "- ", because the changelog ends every bullet with its pull request and release`,
      ])
    },
  )

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

const mergeGroupRef = (pullRequest: string): string =>
  `refs/heads/gh-readonly-queue/main/pr-${pullRequest}-0b9a1b9865859643bedbbb41c3f26b3ff6a1eede`

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

  it("checks the entry of the pull request a merge queue entry tests", () => {
    expect(pullRequestEntryProblems(mergeGroupRef(MERGED_PULL_REQUEST))).toEqual([])
    expect(pullRequestEntryProblems(mergeGroupRef("99999"))).toEqual([
      "Pull request #99999 has no changelog entry: add content/changelog/99999.<locale>.mdx in every locale",
    ])
  })
})

describe("check-content forms of address", () => {
  it.each([
    {
      problems: [`${EXAMPLE_LABEL} uses “Sie” where de-DE addresses the reader as “du”`],
      prose: "Führen Sie `echo Sie` aus, bevor du pushst.",
    },
    { problems: [], prose: "Führe `echo Sie` aus, bevor du pushst." },
  ])("checks the form of address in the prose of a translation and never in its code: $prose", ({ problems, prose }) => {
    const code = "\n\n```sh\necho Sie\n```"

    expect(problemsOf({ source: `Run \`echo Sie\` before you push.${code}`, target: `${prose}${code}` })).toEqual(problems)
  })
})

describe("check-content post dates", () => {
  it.each([
    {
      problem: `${POST_LABEL} has date 2026-08-16 where the English page has date 2026-08-15`,
      target: { date: "2026-08-16", updated: "2026-11-17" },
    },
    {
      problem: `${POST_LABEL} has updated 2026-11-18 where the English page has updated 2026-11-17`,
      target: { date: "2026-08-15", updated: "2026-11-18" },
    },
    {
      problem: `${POST_LABEL} has no updated where the English page has updated 2026-11-17`,
      target: { date: "2026-08-15" },
    },
  ])("fails a post whose translation is dated differently: $problem", ({ problem, target }) => {
    const source = post({ date: "2026-08-15", updated: "2026-11-17" })

    expect(mdxProblems({ label: POST_LABEL, locale: "de-DE", source, target: post(target) })).toEqual([problem])
    expect(mdxProblems({ label: POST_LABEL, locale: "de-DE", source, target: source })).toEqual([])
  })
})

describe("check-content no-break spaces", () => {
  const FRENCH_POST_LABEL = "blog/example.fr-FR.mdx"
  const FRENCH_DOCS_LABEL = "docs/example.fr-FR.mdx"
  const code = "\n\n```ts\nconst ok = flag ? 1 : 2\n```\n\n| Critère | Valeur |\n| :------ | -----: |\n| a | b |"
  const source = page(`Run \`a ? b : c\` first.${code}`)
  const french = (prose: string): string => page(`${prose}${code}`)

  it.each([
    { problems: [], prose: "Lancez `a ? b : c` d’abord : c’est rapide !" },
    {
      problems: [`${FRENCH_POST_LABEL} puts U+0020 before “:” where fr-FR needs a no-break space, U+00A0`],
      prose: "Lancez `a ? b : c` d’abord : c’est rapide !",
    },
    {
      problems: [`${FRENCH_POST_LABEL} puts U+0020 before “?” where fr-FR needs a no-break space, U+00A0`],
      prose: "Lancez `a ? b : c` d’abord, vraiment\n?",
    },
  ])("checks the no-break spaces in the prose of a French post and never in its code or tables: $prose", ({ problems, prose }) => {
    expect(mdxProblems({ label: FRENCH_POST_LABEL, locale: "fr-FR", source, target: french(prose) })).toEqual(problems)
  })

  it("leaves the French docs pages out until their copy is reviewed", () => {
    const target = french("Lancez `a ? b : c` d’abord : c’est rapide !")

    expect(mdxProblems({ label: FRENCH_DOCS_LABEL, locale: "fr-FR", source, target })).toEqual([])
  })
})
