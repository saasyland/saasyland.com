import { describe, expect, it } from "vite-plus/test"

import type { Changelog } from "~/src/lib/changelog"
import { releaseNotes, releaseTag } from "~/src/lib/release"

const DEPLOYED_COMMIT = "4f9c2d1e8b7a6f5e4d3c2b1a0f9e8d7c6b5a4f3e"

const EARLIER_COMMIT = "9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b"

const DEPLOYED_AT = new Date("2026-11-14T09:30:00Z")

const CHANGELOG_LINK = "See the [changelog](https://saasyland.com/docs/project/changelog)."

const CHANGELOG: Changelog = {
  days: [
    {
      date: "2026-11-14",
      entries: [
        { key: "151", source: "- Videos play with captions. See [Videos](/docs/features/videos).\n" },
        { key: "150", source: "- Dependencies updated, see [Vite+](https://viteplus.dev/).\n- Fixed: the logo scrolls to the top.\n" },
      ],
    },
    { date: "2026-11-13", entries: [{ key: "120", source: "- Courses.\n" }] },
  ],
  unreleased: [{ key: "152", source: "- Changelog entries.\n" }],
}

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

describe("releaseNotes", () => {
  it.each(["v2026.11.14", "v2026.11.14.2"])("gives %s the entries that reached main on its day, with absolute site links", (tag) => {
    expect(releaseNotes(CHANGELOG, tag)).toBe(
      [
        "- Videos play with captions. See [Videos](https://saasyland.com/docs/features/videos).",
        "- Dependencies updated, see [Vite+](https://viteplus.dev/).",
        "- Fixed: the logo scrolls to the top.",
      ].join("\n"),
    )
  })

  it("leaves out the entries of other days and the ones not on main yet", () => {
    expect(releaseNotes(CHANGELOG, "v2026.11.13")).toBe("- Courses.")
  })

  it("links to the changelog when no entry reached main that day", () => {
    expect(releaseNotes(CHANGELOG, "v2026.11.12")).toBe(CHANGELOG_LINK)
  })
})
