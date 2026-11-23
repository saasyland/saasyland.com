import { type ReactNode } from "react"

import { renderHook } from "@testing-library/react"
import { IntlProvider } from "use-intl/react"
import { describe, expect, it } from "vite-plus/test"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"

import { BYTES_PER_GIGABYTE, BYTES_PER_KILOBYTE, BYTES_PER_MEGABYTE } from "~/src/modules/video/video.constants"

import { useFileSize } from "~/src/hooks/use-file-size"

const wrapper = ({ children }: { children: ReactNode }) => (
  <IntlProvider locale="en-US" messages={getTestMessages("en-US")}>
    {children}
  </IntlProvider>
)

describe("useFileSize", () => {
  it.each([
    [BYTES_PER_KILOBYTE * 12, "12 kB"],
    [BYTES_PER_MEGABYTE * 2.5, "2.5 MB"],
    [BYTES_PER_GIGABYTE * 3.25, "3.3 GB"],
  ])("writes %d bytes as %s", (bytes, size) => {
    const { result } = renderHook(() => useFileSize(), { wrapper })

    expect(result.current(bytes)).toBe(size)
  })
})
