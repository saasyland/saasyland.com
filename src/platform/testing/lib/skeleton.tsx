import type { ReactElement } from "react"

import { render } from "@testing-library/react"

export const markupOf = (ui: ReactElement): string => {
  const { container, unmount } = render(ui)
  const markup = container.innerHTML
  unmount()
  return markup
}

export const busyMarkup = (container: HTMLElement): string | undefined => container.querySelector('[aria-busy="true"]')?.outerHTML
