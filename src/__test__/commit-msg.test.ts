import { describe, expect, it } from "vite-plus/test"

import { COMMIT_EMOJIS, decoratedSubject, subjectProblems } from "~/scripts/commit-msg"
import { squashTitle } from "~/scripts/enqueue-pr"

const ALLOWED_TYPES = `Allowed types: ${Object.keys(COMMIT_EMOJIS).join(", ")}`

describe("decoratedSubject", () => {
  it.each(Object.entries(COMMIT_EMOJIS))("puts the emoji of %s in front of a subject of that type", (type, emoji) => {
    expect(decoratedSubject(`${type}(scope): change`)).toBe(`${emoji} ${type}(scope): change`)
  })

  it.each(["✨ feat(courses): add courses", "Merge branch 'main'", 'Revert "feat: x"', "fixup! feat: x", "squash! feat: x"])(
    "keeps %j, which already has its emoji or comes from Git",
    (subject) => {
      expect(decoratedSubject(subject)).toBe(subject)
    },
  )

  it("keeps a breaking change's subject apart from its emoji", () => {
    expect(decoratedSubject("feat(api)!: drop v0")).toBe("✨ feat(api)!: drop v0")
  })
})

describe("subjectProblems", () => {
  it.each(["ci: shard the browser suite", "⚙️ ci: shard the browser suite", "Merge branch 'main'"])("accepts %j", (subject) => {
    expect(subjectProblems(subject)).toStrictEqual([])
  })

  it("explains the conventional format to a subject without a type", () => {
    expect(subjectProblems("Shard the browser suite")).toStrictEqual([
      "Commit message does not follow conventional format.",
      "Expected: <type>(<scope>): <description>",
      ALLOWED_TYPES,
    ])
  })

  it("names a type the hook has no emoji for", () => {
    expect(subjectProblems("wip: shard the browser suite")).toStrictEqual(['Unknown commit type: "wip"', ALLOWED_TYPES])
  })
})

describe("squashTitle", () => {
  it("gives a pull request title the emoji the commit hook would, which the merge queue's squash commit then carries", () => {
    expect(squashTitle("ci: test pull requests together in the merge queue ")).toBe("⚙️ ci: test pull requests together in the merge queue")
  })

  it("keeps a title that already has its emoji", () => {
    expect(squashTitle("⚙️ ci: test pull requests together in the merge queue")).toBe(
      "⚙️ ci: test pull requests together in the merge queue",
    )
  })
})
