import { describe, expect, it } from "vite-plus/test"

import { type GitRepository, createGitRepository } from "~/src/platform/testing/lib/git-repository"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import {
  type Changelog,
  ENTRY_KEY,
  ENTRY_ORIGIN,
  MAIN_BRANCH,
  joinEntries,
  originOf,
  pullRequestOf,
  readChangelog,
  unreleasedEntryProblems,
} from "~/src/lib/changelog"

const COMMIT_HASH = "0b9a1b9865859643bedbbb41c3f26b3ff6a1eede"
const TRANSLATED_LOCALE = "de-DE"
const MAIN_REF = `refs/heads/${MAIN_BRANCH}`
const PULL_REQUEST_REF = "refs/pull/220/merge"
const MERGE_GROUP_REF = `refs/heads/gh-readonly-queue/${MAIN_BRANCH}/pr-221-${COMMIT_HASH}`

const entry = (key: string) => ({ key, source: `- Change ${key}.\n` })

const merged = (key: string, release?: string) => ({ ...entry(key), release })

const writeEntries = (repository: GitRepository, keys: readonly string[]): void => {
  for (const key of keys) {
    repository.writeEntry(`${key}.${I18N.DEFAULT_LOCALE}.mdx`, entry(key).source)
  }
}

const MERGE_QUEUE_RULE = "in the merge queue, whose branch already holds the squash commit of every pull request in the group, no entry may"

const problemOf = (key: string, rule: string): string =>
  `content/changelog/${key}.<locale>.mdx matches no commit on main, so the changelog would list it as unreleased; ${rule}. Delete the entry of a pull request that was closed without merging.`

const readEnglish = (repository: GitRepository, upcomingRelease?: string) =>
  readChangelog({ cwd: repository.path, locale: I18N.DEFAULT_LOCALE, upcomingRelease })

const repositoryWithReleases = (): GitRepository => {
  const repository = createGitRepository()

  repository.commit("✨ feat(courses): add courses (#10)", "2026-11-13T10:00:00Z")
  repository.commit("⚙️ ci(release): tag each production deploy (#11)", "2026-11-14T10:00:00Z")
  repository.tag("v2026.11.14")
  repository.commit("🐛 fix(auth): keep the locale (#12)", "2026-11-14T11:00:00Z")
  repository.commit("🚀 perf(worker): load less (#13)", "2026-11-14T12:00:00Z")
  repository.tag("v2026.11.14.2")
  repository.tag("v2.0.0")
  repository.commit("📚 docs(blog): add a post (#14)", "2026-11-15T09:00:00Z")
  writeEntries(repository, ["10", "11", "12", "13", "14", "15"])

  return repository
}

describe("readChangelog", () => {
  it("dates each entry by the UTC day its pull request's squash commit or its own commit reached main, newest first", async () => {
    const repository = createGitRepository()

    repository.commit("✨ feat(courses): add courses (#10)", "2026-11-14T22:00:00+01:00")
    repository.commit("🐛 fix(auth): keep the locale (#11)", "2026-11-15T00:20:00+01:00")
    const pushed = repository.commit("♻️ chore(deps): update packages", "2026-11-16T09:00:00Z")
    repository.commit("🚀 perf(worker): load less (#12)", "2026-11-16T10:00:00Z")
    writeEntries(repository, ["10", "11", "12", "13", "14", pushed])

    await expect(readEnglish(repository)).resolves.toStrictEqual({
      days: [
        { date: "2026-11-16", entries: [merged("12"), merged(pushed)] },
        { date: "2026-11-14", entries: [merged("11"), merged("10")] },
      ],
      unreleased: [entry("14"), entry("13")],
    })
  })

  it("orders entries that reached main in the same second by their key", async () => {
    const repository = createGitRepository()

    repository.commit("✨ feat(app): first (#9)", "2026-09-24T22:22:46Z")
    repository.commit("✨ feat(app): second (#20)", "2026-09-24T22:22:46Z")
    writeEntries(repository, ["9", "20"])

    await expect(readEnglish(repository)).resolves.toMatchObject({ days: [{ date: "2026-09-24", entries: [merged("20"), merged("9")] }] })
  })

  it("reads the entries of the locale it is asked for", async () => {
    const repository = createGitRepository()

    repository.commit("✨ feat(courses): add courses (#10)", "2026-11-13T15:19:27Z")
    repository.writeEntry(`10.${I18N.DEFAULT_LOCALE}.mdx`, "- Courses.\n")
    repository.writeEntry(`10.${TRANSLATED_LOCALE}.mdx`, "- Kurse.\n")

    await expect(readChangelog({ cwd: repository.path, locale: TRANSLATED_LOCALE })).resolves.toStrictEqual({
      days: [{ date: "2026-11-13", entries: [{ key: "10", release: undefined, source: "- Kurse.\n" }] }],
      unreleased: [],
    })
  })

  it("names the first release that shipped each entry and none for the entries merged before the first release tag or after the last", async () => {
    await expect(readEnglish(repositoryWithReleases())).resolves.toStrictEqual({
      days: [
        { date: "2026-11-15", entries: [merged("14")] },
        { date: "2026-11-14", entries: [merged("13", "v2026.11.14.2"), merged("12", "v2026.11.14.2"), merged("11", "v2026.11.14")] },
        { date: "2026-11-13", entries: [merged("10")] },
      ],
      unreleased: [entry("15")],
    })
  })

  it("names the release a production deploy is about to publish for the entries it brings", async () => {
    await expect(readEnglish(repositoryWithReleases(), "v2026.11.15")).resolves.toMatchObject({
      days: [{ date: "2026-11-15", entries: [merged("14", "v2026.11.15")] }, { date: "2026-11-14" }, { date: "2026-11-13" }],
    })
  })

  it("keeps the tag the deployed commit already has and the earliest of two release tags on one commit", async () => {
    const repository = repositoryWithReleases()

    repository.tag("v2026.11.15")
    repository.tag("v2026.11.15.2")

    await expect(readEnglish(repository, "v2026.11.15.3")).resolves.toMatchObject({
      days: [{ date: "2026-11-15", entries: [merged("14", "v2026.11.15")] }, { date: "2026-11-14" }, { date: "2026-11-13" }],
    })
  })

  it("names the first release of a repository that has no release tag yet only for the deployed commit", async () => {
    const repository = createGitRepository()

    repository.commit("✨ feat(courses): add courses (#10)", "2026-11-13T10:00:00Z")
    repository.commit("🐛 fix(auth): keep the locale (#11)", "2026-11-14T11:00:00Z")
    writeEntries(repository, ["10", "11"])

    await expect(readEnglish(repository, "v2026.11.14")).resolves.toMatchObject({
      days: [
        { date: "2026-11-14", entries: [merged("11", "v2026.11.14")] },
        { date: "2026-11-13", entries: [merged("10")] },
      ],
    })
  })

  it("refuses a shallow clone, whose history would date every entry wrongly", async () => {
    const repository = createGitRepository()

    writeEntries(repository, ["1", "2"])
    repository.commit("✨ feat(app): first (#1)", "2026-11-01T12:00:00Z")
    repository.commit("✨ feat(app): second (#2)", "2026-11-02T12:00:00Z")
    const clone = repository.cloneShallow()

    await expect(readChangelog({ cwd: clone, locale: I18N.DEFAULT_LOCALE })).rejects.toThrow(
      `${clone} is a shallow clone: run git fetch --unshallow`,
    )
  })
})

describe("joinEntries", () => {
  it("joins the entries into one Markdown list and ends every item with its entry's reference", () => {
    expect(joinEntries([entry("12"), { key: "11", source: "- First.\n\n- Second.\n\n" }], ({ key }) => `(#${key})`)).toBe(
      "- Change 12. (#12)\n- First. (#11)\n- Second. (#11)",
    )
  })
})

describe("originOf", () => {
  it.each([
    { key: "1", origin: ENTRY_ORIGIN.PULL_REQUEST },
    { key: "257", origin: ENTRY_ORIGIN.PULL_REQUEST },
    { key: COMMIT_HASH, origin: ENTRY_ORIGIN.COMMIT },
  ])("finds that entry $key came from a $origin", ({ key, origin }) => {
    expect(originOf(key)).toBe(origin)
  })
})

describe("unreleasedEntryProblems", () => {
  const changelog: Changelog = {
    days: [{ date: "2026-11-20", entries: [merged("218")] }],
    unreleased: [entry("220"), entry("219")],
  }

  it("fails a pull request into main whose changelog lists another entry as unreleased, as #220 listed the closed #219", () => {
    expect(unreleasedEntryProblems({ changelog, run: { baseRef: MAIN_BRANCH, ref: PULL_REQUEST_REF } })).toStrictEqual([
      problemOf("219", "in pull request #220, only its own entry may wait for the merge"),
    ])
  })

  it("passes a pull request into main whose own entry is the only one waiting for its merge", () => {
    expect(
      unreleasedEntryProblems({
        changelog: { ...changelog, unreleased: [entry("220")] },
        run: { baseRef: MAIN_BRANCH, ref: PULL_REQUEST_REF },
      }),
    ).toStrictEqual([])
  })

  it("fails a merge group while any entry is unreleased, since its branch holds the squash commit of each pull request in the group", () => {
    expect(unreleasedEntryProblems({ changelog, run: { baseRef: "", ref: MERGE_GROUP_REF } })).toStrictEqual([
      problemOf("220", MERGE_QUEUE_RULE),
      problemOf("219", MERGE_QUEUE_RULE),
    ])
  })

  it("passes a merge group whose pull requests' squash commits date every entry, those of the group included", async () => {
    const repository = createGitRepository()

    repository.commit("✨ feat(courses): add courses (#218)", "2026-11-20T10:00:00Z")
    repository.commit("🐛 fix(auth): keep the locale (#220)", "2026-11-21T10:00:00Z")
    repository.commit("⚙️ ci(queue): test pull requests together (#221)", "2026-11-21T10:00:01Z")
    writeEntries(repository, ["218", "220", "221"])

    expect(unreleasedEntryProblems({ changelog: await readEnglish(repository), run: { baseRef: "", ref: MERGE_GROUP_REF } })).toStrictEqual(
      [],
    )
  })

  it("fails main while any entry is unreleased", () => {
    expect(unreleasedEntryProblems({ changelog, run: { baseRef: "", ref: MAIN_REF } })).toStrictEqual([
      problemOf("220", "on main, no entry may"),
      problemOf("219", "on main, no entry may"),
    ])
  })

  it.each([
    { run: { baseRef: "", ref: "" }, scope: "a local build" },
    { run: { baseRef: "feat/changelog-pr-links", ref: PULL_REQUEST_REF }, scope: "a pull request into another pull request's branch" },
    { run: { baseRef: "", ref: "refs/heads/feat/changelog-pr-links" }, scope: "a branch other than main" },
  ])("lets $scope list unreleased entries", ({ run }) => {
    expect(unreleasedEntryProblems({ changelog, run })).toStrictEqual([])
  })
})

describe("ENTRY_KEY", () => {
  it.each(["1", "202", COMMIT_HASH])("accepts %s, a pull request number or a full commit hash", (key) => {
    expect(ENTRY_KEY.test(key)).toBe(true)
  })

  it.each(["0", "0202", "pr-202", COMMIT_HASH.slice(0, 9), COMMIT_HASH.toUpperCase(), "2026-11-16-courses"])("rejects %s", (key) => {
    expect(ENTRY_KEY.test(key)).toBe(false)
  })
})

describe("pullRequestOf", () => {
  it("reads the number of the pull request a workflow runs for", () => {
    expect(pullRequestOf("refs/pull/202/merge")).toBe("202")
  })

  it("reads the number of the pull request whose merge queue entry a workflow tests", () => {
    expect(pullRequestOf(MERGE_GROUP_REF)).toBe("221")
  })

  it.each(["refs/heads/main", "refs/tags/v2026.11.16", "refs/heads/gh-readonly-queue/beta/pr-221-0b9a1b98", ""])(
    "finds no pull request in %j",
    (ref) => {
      expect(pullRequestOf(ref)).toBeUndefined()
    },
  )
})
