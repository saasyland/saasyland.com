import { render, screen } from "@testing-library/react"
import { describe, expect, it } from "vite-plus/test"

import { createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"

import { MdxSourcePath, getMDXComponents } from "~/src/integrations/fumadocs/mdx"

const Override = () => <p>Custom heading</p>

describe("MDX components", () => {
  it("allows individual component overrides while preserving standard components", () => {
    const components = getMDXComponents({ h1: Override })
    expect(components.h1).toBe(Override)
    expect(components["Button"]).toBe(getMDXComponents()["Button"])
    expect(components.a).toBe(getMDXComponents().a)
  })

  it("resolves document links against their source file and preserves external links", () => {
    const Anchor = getMDXComponents().a
    if (Anchor === undefined) {
      throw new Error("Missing MDX link")
    }
    renderWithRouter(
      <MdxSourcePath value="guides/start.mdx">
        <Anchor href="../setup.mdx#install">Install</Anchor>
        <Anchor href="https://example.com">External</Anchor>
        <Anchor>Anchor without href</Anchor>
      </MdxSourcePath>,
      { router: createTestRouter("/pl-PL/docs/guides/start") },
    )
    expect(screen.getByRole("link", { name: "Install" })).toHaveAttribute("href", "/docs/setup#install")
    expect(screen.getByRole("link", { name: "External" })).toHaveAttribute("href", "https://example.com")
    expect(screen.getByText("Anchor without href")).toHaveAttribute("href", "#")
  })

  it("renders fenced code through the code block component", () => {
    const Pre = getMDXComponents().pre
    if (Pre === undefined) {
      throw new Error("Missing MDX code block")
    }
    render(
      <Pre>
        <code>const ready = true</code>
      </Pre>,
    )
    expect(screen.getByText("const ready = true").closest("pre")).toBeInTheDocument()
  })
})
