import { cleanup, render, screen } from "@testing-library/react"
import { afterEach, describe, expect, it } from "vite-plus/test"

import { MediaUploadZone } from "~/src/presentation/components/custom/admin/media-upload-zone"
import { UploadZonePending } from "~/src/presentation/components/custom/admin/pending-blocks"

const FRAME = ["rounded-xl", "border-2", "border-dashed", "border-border", "bg-muted/40", "p-8"]

afterEach(cleanup)

describe("MediaUploadZone", () => {
  it("draws its content in the dashed frame of its skeleton", () => {
    const skeleton = render(<UploadZonePending />).container.firstElementChild
    render(<MediaUploadZone>Drop a file</MediaUploadZone>)

    expect(screen.getByText("Drop a file")).toHaveClass(...FRAME)
    expect(skeleton).toHaveClass(...FRAME)
  })
})
