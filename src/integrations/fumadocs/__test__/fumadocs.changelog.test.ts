import { VFile } from "vfile"
import { describe, expect, it } from "vite-plus/test"

import { type GitRepository, createGitRepository } from "~/src/platform/testing/lib/git-repository"

import { addChangelogEntries, changelogEntries, listChangelogEntries } from "~/src/integrations/fumadocs/fumadocs.changelog"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

const PAGE = `content/docs/project/changelog.${I18N.DEFAULT_LOCALE}.mdx`
const INTRODUCTION = "Each section lists the changes that reached `main` on that day."
const CHANGELOG_PAGE = `${INTRODUCTION}\n\n<ChangelogEntries unreleased="Unreleased" />\n`

const repositoryWithEntries = (): GitRepository => {
  const repository = createGitRepository()

  repository.commit("✨ feat(courses): add courses (#10)", "2026-11-13T15:19:27Z")
  repository.commit("🐛 fix(auth): keep the locale (#11)", "2026-11-13T18:00:00Z")
  repository.commit("🚀 perf(modules): keep drizzle out of the browser (#12)", "2026-11-15T23:27:18Z")
  repository.writeEntry(`10.${I18N.DEFAULT_LOCALE}.mdx`, "- Courses: `/courses` lists them. See [Courses](/docs/features/courses).\n")
  repository.writeEntry(
    `11.${I18N.DEFAULT_LOCALE}.mdx`,
    "- Fixed: verification links keep the locale.\n- Fixed: so do reset links, at $<year>.\n",
  )
  repository.writeEntry(`12.${I18N.DEFAULT_LOCALE}.mdx`, "- The browser no longer downloads Drizzle.\n")
  repository.writeEntry(`13.${I18N.DEFAULT_LOCALE}.mdx`, "- Changelog entries.\n")

  return repository
}

const listIn = (repository: GitRepository, source: string) =>
  listChangelogEntries({ cwd: repository.path, path: `${repository.path}/${PAGE}`, source })

describe("changelog entries", () => {
  it("puts the entries in the page's locale where the page asks for them, under the day each reached main", async () => {
    const sections = [
      INTRODUCTION,
      "## Unreleased",
      "- Changelog entries.",
      "## 2026-11-15",
      "- The browser no longer downloads Drizzle.",
      "## 2026-11-13",
      "- Fixed: verification links keep the locale.\n- Fixed: so do reset links, at $<year>.\n- Courses: `/courses` lists them. See [Courses](/docs/features/courses).",
    ]

    await expect(listIn(repositoryWithEntries(), CHANGELOG_PAGE)).resolves.toBe(`${sections.join("\n\n")}\n`)
  })

  it("leaves out the unreleased section when every entry has reached main", async () => {
    const repository = repositoryWithEntries()

    repository.commit("📚 docs(changelog): give each change its own entry (#13)", "2026-11-16T04:00:00Z")

    await expect(listIn(repository, CHANGELOG_PAGE)).resolves.toContain(
      `${INTRODUCTION}\n\n## 2026-11-16\n\n- Changelog entries.\n\n## 2026-11-15`,
    )
  })

  it("leaves every other page as it is", async () => {
    await expect(listIn(repositoryWithEntries(), INTRODUCTION)).resolves.toBe(INTRODUCTION)
  })

  it("rewrites the document Fumadocs compiles", async () => {
    const repository = repositoryWithEntries()
    const file = new VFile({ cwd: repository.path, path: `${repository.path}/${PAGE}`, value: CHANGELOG_PAGE })

    await addChangelogEntries(file)

    expect(file.toString()).toBe(await listIn(repository, CHANGELOG_PAGE))
    expect(changelogEntries.doc.vfile).toBe(addChangelogEntries)
  })
})
