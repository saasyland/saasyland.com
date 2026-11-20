import { useEffect, useState } from "react"

import { MILLISECONDS_PER_SECOND } from "~/src/lib/duration"

export const useCountdown = (): { readonly remainingSeconds: number; readonly start: (seconds: number) => void } => {
  const [countdown, setCountdown] = useState({ seconds: 0 })
  const [remainingSeconds, setRemainingSeconds] = useState(0)

  useEffect(() => {
    const endsAt = Date.now() + countdown.seconds * MILLISECONDS_PER_SECOND
    const timers = new Set<ReturnType<typeof setTimeout>>()

    const tick = (): void => {
      const left = Math.max(0, Math.ceil((endsAt - Date.now()) / MILLISECONDS_PER_SECOND))
      setRemainingSeconds(left)
      if (left > 0) {
        timers.add(globalThis.setTimeout(tick, MILLISECONDS_PER_SECOND))
      }
    }

    tick()

    return () => {
      for (const timer of timers) {
        globalThis.clearTimeout(timer)
      }
    }
  }, [countdown])

  return {
    remainingSeconds,
    start: (seconds) => {
      setCountdown({ seconds })
    },
  }
}
