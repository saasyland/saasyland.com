export const MILLISECONDS_PER_SECOND = 1000
export const SECONDS_PER_MINUTE = 60
export const MINUTES_PER_HOUR = 60
const CLOCK_PAD = 2

const pad = (value: number): string => String(value).padStart(CLOCK_PAD, "0")

export const formatClock = (milliseconds: number): string => {
  const totalSeconds = Math.round(milliseconds / MILLISECONDS_PER_SECOND)
  const hours = Math.floor(totalSeconds / (SECONDS_PER_MINUTE * MINUTES_PER_HOUR))
  const minutes = Math.floor(totalSeconds / SECONDS_PER_MINUTE) % MINUTES_PER_HOUR
  const seconds = totalSeconds % SECONDS_PER_MINUTE

  if (hours > 0) {
    return `${String(hours)}:${pad(minutes)}:${pad(seconds)}`
  }

  return `${String(minutes)}:${pad(seconds)}`
}
