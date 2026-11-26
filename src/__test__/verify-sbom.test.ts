import { describe, expect, it } from "vite-plus/test"

import { SBOM_FORMAT, missingDependencies, packageOf } from "~/scripts/verify-sbom"

const REACT = "react"
const ROUTER = "@tanstack/react-router"

const component = (purl: string) => ({ purl, version: "1.0.0" })

describe("packageOf", () => {
  it("reads the package name of an npm package URL, scoped or not, without its version or qualifiers", () => {
    expect(packageOf("pkg:npm/react@19.3.1")).toBe(REACT)
    expect(packageOf("pkg:npm/%40tanstack/react-router@1.170.46?vcs_url=x#src")).toBe(ROUTER)
  })
})

describe("missingDependencies", () => {
  it("names each production dependency the SBOM does not list", () => {
    const sbom = { bomFormat: SBOM_FORMAT, components: [component("pkg:npm/react@19.3.1")] }

    expect(missingDependencies(sbom, [REACT, ROUTER])).toStrictEqual([ROUTER])
  })

  it("refuses a file that is not a CycloneDX SBOM of npm packages", () => {
    expect(() => missingDependencies({ bomFormat: "SPDX", components: [] }, [])).toThrow()
    expect(() => missingDependencies({ bomFormat: SBOM_FORMAT, components: [component("pkg:pypi/requests@2.0.0")] }, [])).toThrow()
  })
})
