import { readFileSync } from "node:fs"
import { describe, expect, it } from "vite-plus/test"

import { mdxProblems, pageProblems, sourcePages } from "~/scripts/check-content"

const API_SURFACE = "content/docs/features/api-surface"
const API_SURFACE_LABEL = "docs/features/api-surface.pl-PL.mdx"
const CLI_API_ROW = 'name="cliApiBasePath"'
const EXAMPLE_LABEL = "docs/example.de-DE.mdx"

const readApiSurface = (locale: string): string => readFileSync(`${API_SURFACE}.${locale}.mdx`, "utf8")

const page = (body: string): string => `---\ntitle: "Page"\n---\n\n${body}\n`

const problemsOf = ({ source, target }: { source: string; target: string }): string[] =>
  mdxProblems({ label: EXAMPLE_LABEL, locale: "de-DE", source: page(source), target: page(target) })

describe("check-content", () => {
  it("checks every English docs page, blog post and navigation file", () => {
    expect(sourcePages()).toEqual(
      expect.arrayContaining(["blog/ai-coding-agents-repository-readiness.en-US.mdx", "docs/index.en-US.mdx", "docs/meta.en-US.json"]),
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
})
