import { act } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { onTestFinished, vi } from "vite-plus/test"

export const controlTimers = (): ReturnType<typeof userEvent.setup> => {
  vi.useFakeTimers({ shouldAdvanceTime: true, toFake: ["setTimeout", "clearTimeout", "setInterval", "clearInterval"] })
  onTestFinished(() => {
    vi.useRealTimers()
  })
  return userEvent.setup({ advanceTimers: vi.advanceTimersByTime, delay: null })
}

export const passTime = async (milliseconds: number): Promise<void> => {
  await act(() => vi.advanceTimersByTimeAsync(milliseconds))
}
