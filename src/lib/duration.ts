export const MILLISECONDS_PER_SECOND = 1000
export const SECONDS_PER_MINUTE = 60
export const MINUTES_PER_HOUR = 60
export const HOURS_PER_DAY = 24
export const MILLISECONDS_PER_MINUTE = MILLISECONDS_PER_SECOND * SECONDS_PER_MINUTE
export const SECONDS_PER_HOUR = SECONDS_PER_MINUTE * MINUTES_PER_HOUR
export const MILLISECONDS_PER_HOUR = MILLISECONDS_PER_SECOND * SECONDS_PER_HOUR
export const MILLISECONDS_PER_DAY = MILLISECONDS_PER_HOUR * HOURS_PER_DAY
const CLOCK_PAD = 2

const pad = (value: number): string => String(value).padStart(CLOCK_PAD, "0")

export const formatClock = (milliseconds: number): string => {
  const totalSeconds = Math.round(milliseconds / MILLISECONDS_PER_SECOND)
  const hours = Math.floor(totalSeconds / SECONDS_PER_HOUR)
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE) % MINUTES_PER_HOUR
  const seconds = totalSeconds % SECONDS_PER_MINUTE

  if (hours > 0) {
    return `${String(hours)}:${pad(minutes)}:${pad(seconds)}`
  }

  return `${String(minutes)}:${pad(seconds)}`
}

const CLOCK = /^(?:(?<hours>\d+):(?=\d{2}:))?(?<minutes>\d+):(?<seconds>[0-5]\d)$/u

export const parseClock = (clock: string): number | undefined => {
  const parts = CLOCK.exec(clock.trim())?.groups
  if (parts === undefined) {
    return undefined
  }

  const minutes = Number(parts["minutes"])
  if (parts["hours"] !== undefined && minutes >= MINUTES_PER_HOUR) {
    return undefined
  }

  return Number(parts["hours"] ?? 0) * SECONDS_PER_HOUR + minutes * SECONDS_PER_MINUTE + Number(parts["seconds"])
}

export const wholeMinutes = (milliseconds: number): number => Math.ceil(milliseconds / MILLISECONDS_PER_MINUTE)
