import { describe, expect, it } from "vite-plus/test"

import { createGitRepository } from "~/src/platform/testing/lib/git-repository"

import { readTags, releaseTag } from "~/src/lib/release"

const DEPLOYED_COMMIT = "4f9c2d1e8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e"

const EARLIER_COMMIT = "9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b"

const DEPLOYED_AT = new Date("2026-11-14T09:30:00Z")

const earlierTags = (...names: readonly string[]): { commit: string; name: string }[] =>
  names.map((name) => ({ commit: EARLIER_COMMIT, name }))

describe("releaseTag", () => {
  it("tags the first deploy of a day with its UTC date", () => {
    expect(releaseTag(DEPLOYED_COMMIT, DEPLOYED_AT, [])).toBe("v2026.11.14")
  })

  it("takes the date in UTC, whatever the time zone of the runner", () => {
    expect(releaseTag(DEPLOYED_COMMIT, new Date("2026-11-14T23:30:00-05:00"), [])).toBe("v2026.11.15")
  })

  it.each([
    { expected: "v2026.11.14.2", tags: ["v2026.11.14"] },
    { expected: "v2026.11.14.3", tags: ["v2026.11.14", "v2026.11.14.2"] },
    { expected: "v2026.11.14.4", tags: ["v2026.11.14", "v2026.11.14.3"] },
    { expected: "v2026.11.14.11", tags: ["v2026.11.14.10", "v2026.11.14.9"] },
  ])("numbers a later deploy that day after the highest tag of the day: $expected", ({ expected, tags }) => {
    expect(releaseTag(DEPLOYED_COMMIT, DEPLOYED_AT, earlierTags(...tags))).toBe(expected)
  })

  it("ignores the tags of other days and tags that are not release tags", () => {
    const tags = earlierTags("v2026.11.13", "v2026.11.13.2", "v2026.11.15", "v2.0.0", "v2026.11.14-rc.1", "2026.11.14")

    expect(releaseTag(DEPLOYED_COMMIT, DEPLOYED_AT, tags)).toBe("v2026.11.14")
  })

  it("keeps the release tag the commit already has, so a re-run does not tag it twice", () => {
    const tags = [...earlierTags("v2026.11.13"), { commit: DEPLOYED_COMMIT, name: "v2026.11.13.2" }]

    expect(releaseTag(DEPLOYED_COMMIT, DEPLOYED_AT, tags)).toBe("v2026.11.13.2")
  })

  it("does not take another kind of tag on the commit for its release tag", () => {
    expect(releaseTag(DEPLOYED_COMMIT, DEPLOYED_AT, [{ commit: DEPLOYED_COMMIT, name: "v2.0.0" }])).toBe("v2026.11.14")
  })
})

describe("readTags", () => {
  it("reads every tag of the repository with the commit it points at", () => {
    const repository = createGitRepository()

    expect(readTags(repository.path)).toStrictEqual([])

    const first = repository.commit("⚙️ ci(release): tag each production deploy (#135)", "2026-11-14T10:00:00Z")
    repository.tag("v2026.11.14")
    const second = repository.commit("📚 docs(ssot): print the values (#137)", "2026-11-14T12:00:00Z")
    repository.tag("v2026.11.14.2")

    expect(readTags(repository.path)).toStrictEqual([
      { commit: first, name: "v2026.11.14" },
      { commit: second, name: "v2026.11.14.2" },
    ])
  })
})
