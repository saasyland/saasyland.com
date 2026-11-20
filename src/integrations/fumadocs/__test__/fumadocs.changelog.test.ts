import { VFile } from "vfile"
import { beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { type GitRepository, createGitRepository } from "~/src/platform/testing/lib/git-repository"

import { addChangelogEntries, changelogEntries, listChangelogEntries } from "~/src/integrations/fumadocs/fumadocs.changelog"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { MAIN_BRANCH } from "~/src/lib/changelog"

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

const runIn = ({ baseRef, ref }: { baseRef: string; ref: string }): void => {
  vi.stubEnv("GITHUB_BASE_REF", baseRef)
  vi.stubEnv("GITHUB_REF", ref)
}

beforeEach(() => {
  runIn({ baseRef: "", ref: "" })
})

describe("changelog entries", () => {
  it("puts the entries in the page's locale where the page asks for them, under the day each reached main, each ending with its pull request", async () => {
    const sections = [
      INTRODUCTION,
      "## Unreleased",
      '- Changelog entries. <ChangelogLinks pullRequest="13" />',
      "## 2026-11-15",
      '- The browser no longer downloads Drizzle. <ChangelogLinks pullRequest="12" />',
      "## 2026-11-13",
      [
        "- Fixed: verification links keep the locale.",
        '- Fixed: so do reset links, at $<year>. <ChangelogLinks pullRequest="11" />',
        '- Courses: `/courses` lists them. See [Courses](/docs/features/courses). <ChangelogLinks pullRequest="10" />',
      ].join("\n"),
    ]

    await expect(listIn(repositoryWithEntries(), CHANGELOG_PAGE)).resolves.toBe(`${sections.join("\n\n")}\n`)
  })

  it("links an entry that reached main without a pull request to its commit", async () => {
    const repository = repositoryWithEntries()
    const commit = repository.commit("♻️ chore(deps): update packages", "2026-11-16T09:00:00Z")

    repository.writeEntry(`${commit}.${I18N.DEFAULT_LOCALE}.mdx`, "- Dependencies updated.\n")

    await expect(listIn(repository, CHANGELOG_PAGE)).resolves.toContain(
      `## 2026-11-16\n\n- Dependencies updated. <ChangelogLinks commit="${commit}" />\n\n## 2026-11-15`,
    )
  })

  it("fails the build of a pull request into main whose page would list another pull request's entry as unreleased", async () => {
    const repository = repositoryWithEntries()

    repository.writeEntry(`14.${I18N.DEFAULT_LOCALE}.mdx`, "- Pull request 14.\n")
    runIn({ baseRef: MAIN_BRANCH, ref: "refs/pull/14/merge" })

    await expect(listIn(repository, CHANGELOG_PAGE)).rejects.toThrow(
      "content/changelog/13.<locale>.mdx matches no commit on main, so the changelog would list it as unreleased; in pull request #14, only its own entry may wait for the merge.",
    )
  })

  it("builds a pull request into main whose own entry is the only one waiting for the merge", async () => {
    runIn({ baseRef: MAIN_BRANCH, ref: "refs/pull/13/merge" })

    await expect(listIn(repositoryWithEntries(), CHANGELOG_PAGE)).resolves.toContain("## Unreleased")
  })

  it("fails the build of main while an entry is unreleased, and leaves every other page alone", async () => {
    runIn({ baseRef: "", ref: `refs/heads/${MAIN_BRANCH}` })

    await expect(listIn(repositoryWithEntries(), CHANGELOG_PAGE)).rejects.toThrow(
      "content/changelog/13.<locale>.mdx matches no commit on main, so the changelog would list it as unreleased; on main, no entry may.",
    )
    await expect(listIn(repositoryWithEntries(), INTRODUCTION)).resolves.toBe(INTRODUCTION)
  })

  it("leaves out the unreleased section when every entry has reached main", async () => {
    const repository = repositoryWithEntries()

    repository.commit("📚 docs(changelog): give each change its own entry (#13)", "2026-11-16T04:00:00Z")

    await expect(listIn(repository, CHANGELOG_PAGE)).resolves.toContain(
      `${INTRODUCTION}\n\n## 2026-11-16\n\n- Changelog entries. <ChangelogLinks pullRequest="13" />\n\n## 2026-11-15`,
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
