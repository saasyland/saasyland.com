import { useEffect, useRef } from "react"

export interface DebouncedCallback<TValue> {
  readonly cancel: () => void
  readonly schedule: (value: TValue) => void
}

export const useDebouncedCallback = <TValue>(callback: (value: TValue) => void, delay: number): DebouncedCallback<TValue> => {
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined)

  useEffect(
    () => () => {
      clearTimeout(timer.current)
    },
    [],
  )

  return {
    cancel: () => {
      clearTimeout(timer.current)
    },
    schedule: (value) => {
      clearTimeout(timer.current)
      timer.current = setTimeout(() => {
        callback(value)
      }, delay)
    },
  }
}
