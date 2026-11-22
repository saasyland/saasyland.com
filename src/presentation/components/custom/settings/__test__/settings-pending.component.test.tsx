import { render } from "@testing-library/react"
import { describe, expect, it } from "vite-plus/test"

import { SETTINGS_TABS } from "~/src/data/auth"

import {
  DeleteAccountCardPending,
  EmailCardPending,
  SettingsTabsPending,
} from "~/src/presentation/components/custom/settings/settings-pending"

const skeletonsIn = (container: HTMLElement, slot: string): number =>
  container.querySelectorAll(`[data-slot=${slot}] [data-slot=skeleton]`).length

describe("settings skeletons", () => {
  it("draws one placeholder for every settings tab", () => {
    const { container } = render(<SettingsTabsPending />)

    expect(container.querySelectorAll("[data-slot=skeleton]")).toHaveLength(SETTINGS_TABS.length)
  })

  it("reserves the verification badge beside the email card's title, with the address and its button", () => {
    const { container } = render(<EmailCardPending />)

    expect(skeletonsIn(container, "card-header")).toBe(3)
    expect(skeletonsIn(container, "card-content")).toBe(1)
    expect(skeletonsIn(container, "card-footer")).toBe(1)
  })

  it("draws the delete account card's title without a badge, its notices and its button", () => {
    const { container } = render(<DeleteAccountCardPending />)

    expect(skeletonsIn(container, "card-header")).toBe(2)
    expect(skeletonsIn(container, "card-content")).toBe(2)
    expect(skeletonsIn(container, "card-footer")).toBe(1)
  })
})
