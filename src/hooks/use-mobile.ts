import { useEffect, useState } from "react"

const MOBILE_BREAKPOINT = 768

export const useIsMobile = (): boolean => {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mobileQuery = globalThis.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)

    const syncWithViewport = (): void => {
      setIsMobile(globalThis.innerWidth < MOBILE_BREAKPOINT)
    }

    mobileQuery.addEventListener("change", syncWithViewport)
    syncWithViewport()

    return () => {
      mobileQuery.removeEventListener("change", syncWithViewport)
    }
  }, [])

  return isMobile
}
