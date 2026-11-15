import * as AREA_TIME_ZONES from "~/src/data/time-zone.entries"

export interface TimeZoneSource {
  readonly useTimeZone: () => string
}

const AREAS: Readonly<Record<string, readonly TimeZoneSource[]>> = AREA_TIME_ZONES

export const TIME_ZONE_SOURCES = Object.values(AREAS).flat()
