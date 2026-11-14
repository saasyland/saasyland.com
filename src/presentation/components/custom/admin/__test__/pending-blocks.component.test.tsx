import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { renderWithRouter } from "~/src/platform/testing/lib/render"

import { Input } from "~/src/presentation/components/shadcn/input"
import { Switch } from "~/src/presentation/components/shadcn/switch"

import { MediaUploadZone } from "~/src/presentation/components/custom/admin/media-upload-zone"
import { FieldPending, SwitchPending, UploadZonePending } from "~/src/presentation/components/custom/admin/pending-blocks"

const SKELETON = '[data-slot="skeleton"]'

afterEach(cleanup)

describe("form skeleton blocks shared by the admin areas", () => {
  it("draws a field as a label line above a control as tall, wide and round as the input", () => {
    const [label, control] = render(<FieldPending />).container.querySelectorAll(SKELETON)
    const input = renderWithRouter(<Input aria-label="Name" />).container.querySelector("input")

    expect(label).toHaveClass("text-sm")
    expect(control).toHaveClass("h-8", "w-full", "rounded-lg")
    expect(input).toHaveClass("h-8", "w-full", "rounded-lg")
  })

  it("draws a switch as a pill the size of the default switch track", () => {
    const pill = render(<SwitchPending />).container.querySelector(SKELETON)
    const track = render(<Switch aria-label="Published" />).container.querySelector('[data-slot="switch-button"]')

    expect(pill).toHaveClass("h-[18.4px]", "w-8", "rounded-full")
    expect(track).toHaveClass("data-[size=default]:h-[18.4px]", "data-[size=default]:w-[32px]", "rounded-full")
  })

  it("draws an upload zone in the dashed frame of the media upload zone", () => {
    const frame = render(<UploadZonePending />).container.firstElementChild
    render(<MediaUploadZone>Drop a file</MediaUploadZone>)
    const zone = screen.getByText("Drop a file")

    expect(frame?.querySelectorAll(SKELETON)).toHaveLength(3)
    for (const element of [frame, zone]) {
      expect(element).toHaveClass("rounded-xl", "border-2", "border-dashed", "border-border", "bg-muted/40", "p-8")
    }
  })
})
