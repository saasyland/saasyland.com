import { render } from "@testing-library/react"
import { describe, expect, it } from "vite-plus/test"

import { Github, Google, Icons } from "~/src/presentation/components/custom/icons"

describe("icons helper", () => {
  it("renders github and google icons", () => {
    expect.hasAssertions()
    render(
      <div>
        <Github className="github-icon" />
        <Google className="google-icon" />
      </div>,
    )
    expect(document.querySelector(".github-icon")).toBeInTheDocument()
    expect(document.querySelector(".google-icon")).toBeInTheDocument()
    expect(Icons.Github).toBe(Github)
  })
})
