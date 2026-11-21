import { cleanup, render } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { Input } from "~/src/presentation/components/shadcn/input"

import { FieldPending } from "~/src/presentation/components/custom/admin/pending-blocks"

const SKELETON = '[data-slot="skeleton"]'

afterEach(cleanup)

describe("form skeleton blocks shared by the admin areas", () => {
  it("draws a field as a label line above a control as tall, wide and round as the input", () => {
    const [label, control] = render(<FieldPending />).container.querySelectorAll(SKELETON)
    const input = renderWithRouter(<Input aria-label="Name" />).container.querySelector("input")

    expect(label).toHaveClass("text-sm")
    expect(control).toHaveClass("h-8", "w-full", "rounded-md")
    expect(input).toHaveClass("h-8", "w-full", "rounded-md")
  })
})
