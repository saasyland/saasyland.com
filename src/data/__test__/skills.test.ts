import { describe, expect, it } from "vite-plus/test"

import { SKILL_SOURCES, isSkillSource, matchesPackage, skillGroup } from "~/src/data/skills"

describe("skillGroup", () => {
  it("files a skill under the group of its source", () => {
    expect(skillGroup({ skillPath: "skills/resend/SKILL.md", source: "resend/resend-skills" })).toBe(
      SKILL_SOURCES["resend/resend-skills"].group,
    )
  })

  it("files the TanStack Start skills of the router repository under tanstack/start", () => {
    expect(skillGroup({ skillPath: "packages/react-start/skills/react-start/SKILL.md", source: "TanStack/router" })).toBe("tanstack/start")
    expect(skillGroup({ skillPath: "packages/start-client-core/skills/start-core/SKILL.md", source: "TanStack/router" })).toBe(
      "tanstack/start",
    )
    expect(skillGroup({ skillPath: "packages/react-router/skills/react-router/SKILL.md", source: "TanStack/router" })).toBe(
      "tanstack/router",
    )
  })

  it("has no group for a source that SKILL_SOURCES does not list", () => {
    expect(isSkillSource("someone/skills")).toBe(false)
    expect(skillGroup({ skillPath: "SKILL.md", source: "someone/skills" })).toBeUndefined()
  })
})

describe("matchesPackage", () => {
  it("matches a package by its name", () => {
    expect(matchesPackage("resend", "resend")).toBe(true)
    expect(matchesPackage("resend", "react-email")).toBe(false)
  })

  it("matches every package of a scope", () => {
    expect(matchesPackage("@polar-sh/*", "@polar-sh/sdk")).toBe(true)
    expect(matchesPackage("@polar-sh/*", "@polar-sh-fork/sdk")).toBe(false)
    expect(matchesPackage("@polar-sh/*", "polar")).toBe(false)
  })
})
