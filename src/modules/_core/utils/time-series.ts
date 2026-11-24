import * as zod from "zod"

export const TIME_RANGE = {
  LAST_12_MONTHS: "12m",
  LAST_30_DAYS: "30d",
  LAST_7_DAYS: "7d",
} as const

export const TIME_RANGES = [TIME_RANGE.LAST_7_DAYS, TIME_RANGE.LAST_30_DAYS, TIME_RANGE.LAST_12_MONTHS] as const

export type TimeRange = (typeof TIME_RANGES)[number]

export const DEFAULT_TIME_RANGE: TimeRange = TIME_RANGE.LAST_30_DAYS

export const TIME_BUCKET = {
  DAY: "day",
  MONTH: "month",
} as const

export type TimeBucket = (typeof TIME_BUCKET)[keyof typeof TIME_BUCKET]

const DAYS_IN_SHORT_RANGE = 7
const DAYS_IN_LONG_RANGE = 30
const MONTHS_IN_RANGE = 12

const RANGE_BUCKETS = {
  [TIME_RANGE.LAST_7_DAYS]: { bucket: TIME_BUCKET.DAY, count: DAYS_IN_SHORT_RANGE },
  [TIME_RANGE.LAST_30_DAYS]: { bucket: TIME_BUCKET.DAY, count: DAYS_IN_LONG_RANGE },
  [TIME_RANGE.LAST_12_MONTHS]: { bucket: TIME_BUCKET.MONTH, count: MONTHS_IN_RANGE },
} as const satisfies Record<TimeRange, { readonly bucket: TimeBucket; readonly count: number }>

const BUCKET_KEY_LENGTHS = {
  [TIME_BUCKET.DAY]: "YYYY-MM-DD".length,
  [TIME_BUCKET.MONTH]: "YYYY-MM".length,
} as const satisfies Record<TimeBucket, number>

export const BUCKET_SQL_FORMATS = {
  [TIME_BUCKET.DAY]: "%Y-%m-%d",
  [TIME_BUCKET.MONTH]: "%Y-%m",
} as const satisfies Record<TimeBucket, string>

export const timeRangeSchema = zod.object({ range: zod.enum(TIME_RANGES).default(DEFAULT_TIME_RANGE) })

export interface TimePoint {
  readonly start: Date
  readonly value: number
}

export interface TimeSeries {
  readonly bucket: TimeBucket
  readonly since: Date
  readonly starts: readonly Date[]
}

const bucketStart = (bucket: TimeBucket, now: Date, offset: number): Date => {
  if (bucket === TIME_BUCKET.MONTH) {
    return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + offset))
  }

  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + offset))
}

export const timeSeries = (range: TimeRange, now: Date): TimeSeries => {
  const { bucket, count } = RANGE_BUCKETS[range]

  return {
    bucket,
    since: bucketStart(bucket, now, 1 - count),
    starts: Array.from({ length: count }, (_, index) => bucketStart(bucket, now, index + 1 - count)),
  }
}

export const bucketKey = (start: Date, bucket: TimeBucket): string => start.toISOString().slice(0, BUCKET_KEY_LENGTHS[bucket])

export const pointsOf = (series: TimeSeries, values: ReadonlyMap<string, number>): TimePoint[] =>
  series.starts.map((start) => ({ start, value: values.get(bucketKey(start, series.bucket)) ?? 0 }))
