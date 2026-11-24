const MOVE_EVENT = "pointermove"

const PRESS_EVENT = "pointerdown"

const MOUSE_POINTER = "mouse"

const PRIMARY_BUTTON = 0

const PRIMARY_BUTTON_ONLY = 1

const isPressReportedAsMove = ({ button, buttons, pointerType }: PointerEvent): boolean =>
  pointerType === MOUSE_POINTER && button === PRIMARY_BUTTON && buttons === PRIMARY_BUTTON_ONLY

const restorePointerDown = (event: PointerEvent): void => {
  if (isPressReportedAsMove(event)) {
    event.target?.dispatchEvent(new PointerEvent(PRESS_EVENT, event))
  }
}

export const restoreLostPointerDowns = (): (() => void) => {
  const listening = new AbortController()
  globalThis.addEventListener(MOVE_EVENT, restorePointerDown, { capture: true, signal: listening.signal })

  return () => {
    listening.abort()
  }
}
