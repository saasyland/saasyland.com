import { createElement } from "react"
import { renderToString } from "react-dom/server"

import { act, renderHook } from "@testing-library/react"
import { afterEach, describe, expect, it, vi } from "vite-plus/test"

import { DATA_GRID_DENSITY } from "~/src/integrations/tanstack-table/table.features"

import { useDataGridPreferences } from "~/src/hooks/use-data-grid-preferences"

const STORAGE_PREFIX = "saasyland.com:data-grid:v1:"

const Probe = (): string => JSON.stringify(useDataGridPreferences("server").preferences)

afterEach(() => {
  localStorage.clear()
  vi.restoreAllMocks()
})

describe("data grid preferences", () => {
  it("reads the layout a grid saved earlier in this browser", () => {
    localStorage.setItem(`${STORAGE_PREFIX}saved`, JSON.stringify({ density: DATA_GRID_DENSITY.COMPACT, pageSize: 25 }))

    const { result } = renderHook(() => useDataGridPreferences("saved"))

    expect(result.current.preferences).toStrictEqual({ density: DATA_GRID_DENSITY.COMPACT, pageSize: 25 })
  })

  it("starts from nothing when the saved layout is not JSON or not a layout", () => {
    localStorage.setItem(`${STORAGE_PREFIX}broken`, "{")
    localStorage.setItem(`${STORAGE_PREFIX}foreign`, JSON.stringify({ pageSize: 7 }))

    expect(renderHook(() => useDataGridPreferences("broken")).result.current.preferences).toStrictEqual({})
    expect(renderHook(() => useDataGridPreferences("foreign")).result.current.preferences).toStrictEqual({})
  })

  it("saves each change on top of the earlier ones and forgets them all on reset", () => {
    const { result } = renderHook(() => useDataGridPreferences("changes"))

    act(() => {
      result.current.update({ density: DATA_GRID_DENSITY.COMPACT })
    })
    act(() => {
      result.current.update({ columnVisibility: { email: false } })
    })

    expect(result.current.preferences).toStrictEqual({ columnVisibility: { email: false }, density: DATA_GRID_DENSITY.COMPACT })
    expect(JSON.parse(localStorage.getItem(`${STORAGE_PREFIX}changes`) ?? "")).toStrictEqual(result.current.preferences)

    act(() => {
      result.current.reset()
    })

    expect(result.current.preferences).toStrictEqual({})
    expect(localStorage.getItem(`${STORAGE_PREFIX}changes`)).toBeNull()
  })

  it("keeps the layout for the visit when the browser refuses storage", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new DOMException("denied", "SecurityError")
    })
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("full", "QuotaExceededError")
    })
    const { result } = renderHook(() => useDataGridPreferences("refused"))

    act(() => {
      result.current.update({ pageSize: 50 })
    })

    expect(result.current.preferences).toStrictEqual({ pageSize: 50 })
  })

  it("renders the default layout on the server", () => {
    localStorage.setItem(`${STORAGE_PREFIX}server`, JSON.stringify({ pageSize: 25 }))
    expect(renderToString(createElement(Probe))).toBe("{}")
  })
})
