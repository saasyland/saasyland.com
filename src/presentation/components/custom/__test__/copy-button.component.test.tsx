import { act, fireEvent, render, screen, waitFor } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { CopyButton } from "~/src/presentation/components/custom/copy-button"
import { MotionProvider } from "~/src/presentation/components/custom/motion-provider"

const writeText = vi.fn<(value: string) => Promise<void>>()

afterEach(() => {
  vi.useRealTimers()
  vi.unstubAllGlobals()
  writeText.mockReset()
})

const renderButton = () => {
  vi.stubGlobal("navigator", { clipboard: { writeText } })
  return render(
    <MotionProvider>
      <CopyButton copiedLabel="Copied" copyLabel="Copy command" value="bunx saasyland init" />
    </MotionProvider>,
  )
}

describe("copy command", () => {
  it("copies the exact command and resets the confirmation after two seconds", async () => {
    writeText.mockResolvedValue(undefined)
    renderButton()
    fireEvent.click(screen.getByRole("button", { name: "Copy command" }))
    await screen.findByRole("button", { name: "Copied" })
    expect(writeText).toHaveBeenCalledExactlyOnceWith("bunx saasyland init")
    await waitFor(
      () => {
        expect(screen.getByRole("button", { name: "Copy command" })).toBeInTheDocument()
      },
      { timeout: 3000 },
    )
  })

  it("keeps the copy action available after clipboard permission is denied", async () => {
    writeText.mockRejectedValue(new Error("Permission denied"))
    renderButton()
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy command" }))
      await Promise.resolve()
    })
    expect(screen.getByRole("button", { name: "Copy command" })).toBeEnabled()
    expect(screen.queryByText("Copied")).not.toBeInTheDocument()
    expect(writeText).toHaveBeenCalledOnce()
  })

  it("cancels the confirmation timer when the button is removed", async () => {
    writeText.mockResolvedValue(undefined)
    vi.useFakeTimers()
    const { unmount } = renderButton()
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "Copy command" }))
      await Promise.resolve()
    })
    expect(screen.getByRole("button", { name: "Copied" })).toBeInTheDocument()
    const clearTimeout = vi.spyOn(globalThis, "clearTimeout")
    unmount()
    expect(clearTimeout).toHaveBeenCalled()
    clearTimeout.mockRestore()
  })
})
