import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, it, vi } from "vite-plus/test"

import { createContentDirectory } from "~/src/platform/testing/lib/content-directory"

import {
  type ActionRelease,
  type LatestRelease,
  actionReferences,
  outdatedActions,
  pinActions,
  referencesIn,
  releaseFromTags,
  updateActions,
} from "~/scripts/github-actions"

const CHECKOUT = "actions/checkout"
const SETUP_BUN = "oven-sh/setup-bun"
const OLD_COMMIT = "1".repeat(40)
const TAG_OBJECT = "2".repeat(40)
const NEW_COMMIT = "3".repeat(40)
const MAJOR_COMMIT = "4".repeat(40)
const OLDER_COMMIT = "5".repeat(40)
const WORKFLOW = ".github/workflows/ci.yml"
const SETUP_ACTION = ".github/actions/setup/action.yml"

const CHECKOUT_RELEASE: ActionRelease = { commit: NEW_COMMIT, version: "v7.0.1" }
const SETUP_BUN_RELEASE: ActionRelease = { commit: OLD_COMMIT, version: "v2.2.0" }
const RELEASES = new Map([
  [CHECKOUT, CHECKOUT_RELEASE],
  [SETUP_BUN, SETUP_BUN_RELEASE],
])

const workflow = (checkout: string): string =>
  [
    "jobs:",
    "  check:",
    "    steps:",
    `      - uses: ${checkout}`,
    "        with:",
    "          persist-credentials: false",
    "      - uses: ./.github/actions/setup",
    "      - name: Upload",
    `        uses: ${CHECKOUT}/subpath@v7`,
    "",
  ].join("\n")

const SETUP = `runs:\n  steps:\n    - uses: ${SETUP_BUN}@${OLD_COMMIT} # v2.2.0\n`

const repository = (checkout: string): string =>
  createContentDirectory({ "README.md": `uses: ${CHECKOUT}@v1\n`, [SETUP_ACTION]: SETUP, [WORKFLOW]: workflow(checkout) })

const latestOf = vi.fn<LatestRelease>((name) => {
  const release = RELEASES.get(name)

  if (release === undefined) {
    throw new Error(`no release for ${name}`)
  }

  return release
})

describe("referencesIn", () => {
  it("reads each other repository's action with its ref and tag, and skips local actions", () => {
    expect(referencesIn(WORKFLOW, workflow(`${CHECKOUT}@${OLD_COMMIT} # v7.0.0`))).toStrictEqual([
      { action: CHECKOUT, file: WORKFLOW, ref: OLD_COMMIT, repository: CHECKOUT, tag: "v7.0.0" },
      { action: `${CHECKOUT}/subpath`, file: WORKFLOW, ref: "v7", repository: CHECKOUT },
    ])
  })
})

describe("actionReferences", () => {
  it("reads the workflows and the composite actions, and nothing else", () => {
    expect(actionReferences(repository(`${CHECKOUT}@v7`)).map(({ file }) => file)).toStrictEqual([SETUP_ACTION, WORKFLOW, WORKFLOW])
  })
})

describe("releaseFromTags", () => {
  const tags = [
    `${OLDER_COMMIT}\trefs/tags/v6.9.0`,
    `${TAG_OBJECT}\trefs/tags/v7.0.1`,
    `${NEW_COMMIT}\trefs/tags/v7.0.1^{}`,
    `${OLD_COMMIT}\trefs/tags/v7.0.0`,
    `${MAJOR_COMMIT}\trefs/tags/v7`,
    `${MAJOR_COMMIT}\trefs/tags/v8.0.0-beta.1`,
    "",
  ].join("\n")

  it("takes the newest stable release and the commit an annotated tag points to", () => {
    expect(releaseFromTags(CHECKOUT, tags)).toStrictEqual(CHECKOUT_RELEASE)
  })

  it("fails for a repository without a release tag", () => {
    expect(() => releaseFromTags(CHECKOUT, `${MAJOR_COMMIT}\trefs/tags/v7\n`)).toThrow(`${CHECKOUT} has no release tag`)
  })
})

describe("pinActions", () => {
  it("rewrites the commit and the tag of every action it has a release for", () => {
    expect(pinActions(`  - uses: ${CHECKOUT}@v7\n  - uses: other/action@v1\n`, RELEASES)).toBe(
      `  - uses: ${CHECKOUT}@${NEW_COMMIT} # v7.0.1\n  - uses: other/action@v1\n`,
    )
  })
})

describe("outdatedActions", () => {
  it("names each repository whose pin is not its latest release, once", () => {
    expect(outdatedActions(repository(`${CHECKOUT}@${OLD_COMMIT} # v7.0.0`), latestOf)).toStrictEqual([
      { from: "v7.0.0", name: CHECKOUT, to: "v7.0.1" },
    ])
  })

  it("names a pin without a tag by its ref", () => {
    expect(outdatedActions(repository(`${CHECKOUT}@${NEW_COMMIT} # v7.0.1`), latestOf)).toStrictEqual([
      { from: "v7", name: CHECKOUT, to: "v7.0.1" },
    ])
  })
})

describe("updateActions", () => {
  it("pins every action to its latest release and leaves the files already current untouched", () => {
    const root = repository(`${CHECKOUT}@v7`)

    expect(updateActions(root, latestOf)).toStrictEqual([{ from: "v7", name: CHECKOUT, to: "v7.0.1" }])
    expect(readFileSync(join(root, WORKFLOW), "utf8")).toBe(
      workflow(`${CHECKOUT}@${NEW_COMMIT} # v7.0.1`).replace(`${CHECKOUT}/subpath@v7`, `${CHECKOUT}/subpath@${NEW_COMMIT} # v7.0.1`),
    )
    expect(readFileSync(join(root, SETUP_ACTION), "utf8")).toBe(SETUP)
    expect(outdatedActions(root, latestOf)).toStrictEqual([])
  })
})
