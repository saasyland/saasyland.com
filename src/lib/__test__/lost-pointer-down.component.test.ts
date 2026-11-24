import { afterEach, expect, it, vi } from "vite-plus/test"

import { restoreLostPointerDowns } from "~/src/lib/lost-pointer-down"

const POINTER = { MOUSE: "mouse", PEN: "pen" } as const

const BUTTON = { NONE: -1, PRIMARY: 0, SECONDARY: 2 } as const

const BUTTONS = { PRIMARY: 1, PRIMARY_AND_SECONDARY: 3 } as const

const POSITION = { clientX: 120, clientY: 48 } as const

const target = (): HTMLButtonElement => {
  const button = document.createElement("button")
  document.body.replaceChildren(button)
  return button
}

const pressesOf = (element: HTMLElement) => {
  const pressed = vi.fn<(event: PointerEvent) => void>()
  element.addEventListener("pointerdown", pressed)
  return pressed
}

const move = (element: HTMLElement, init: PointerEventInit): void => {
  element.dispatchEvent(new PointerEvent("pointermove", { bubbles: true, cancelable: true, composed: true, ...POSITION, ...init }))
}

afterEach(() => {
  document.body.replaceChildren()
})

it("fires the pointerdown that WebKit reports as a move after a drag, at the same place, for the same pointer", () => {
  const stop = restoreLostPointerDowns()
  const button = target()
  const pressed = pressesOf(button)

  move(button, { button: BUTTON.PRIMARY, buttons: BUTTONS.PRIMARY, pointerId: 1, pointerType: POINTER.MOUSE })
  stop()

  expect(pressed).toHaveBeenCalledOnce()
  expect(pressed.mock.calls[0]?.[0]).toMatchObject({
    bubbles: true,
    button: BUTTON.PRIMARY,
    buttons: BUTTONS.PRIMARY,
    pointerId: 1,
    pointerType: POINTER.MOUSE,
    target: button,
    ...POSITION,
  })
})

it.each([
  { button: BUTTON.NONE, buttons: BUTTONS.PRIMARY, pointerType: POINTER.MOUSE },
  { button: BUTTON.PRIMARY, buttons: BUTTONS.PRIMARY_AND_SECONDARY, pointerType: POINTER.MOUSE },
  { button: BUTTON.SECONDARY, buttons: BUTTONS.PRIMARY, pointerType: POINTER.MOUSE },
  { button: BUTTON.PRIMARY, buttons: BUTTONS.PRIMARY, pointerType: POINTER.PEN },
])("leaves a move that is not a lone press of the primary mouse button alone: %o", (init) => {
  const stop = restoreLostPointerDowns()
  const button = target()
  const pressed = pressesOf(button)

  move(button, init)
  stop()

  expect(pressed).not.toHaveBeenCalled()
})

it("stops restoring presses once it is cleaned up", () => {
  restoreLostPointerDowns()()
  const button = target()
  const pressed = pressesOf(button)

  move(button, { button: BUTTON.PRIMARY, buttons: BUTTONS.PRIMARY, pointerType: POINTER.MOUSE })

  expect(pressed).not.toHaveBeenCalled()
})
