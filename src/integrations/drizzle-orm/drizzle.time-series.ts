import { type SQL, sql } from "drizzle-orm"
import type { SQLiteColumn } from "drizzle-orm/sqlite-core"

import { BUCKET_SQL_FORMATS, type TimeBucket } from "~/src/modules/_core/utils/time-series"

import { MILLISECONDS_PER_SECOND } from "~/src/lib/duration"

export const bucketOf = (column: SQLiteColumn, bucket: TimeBucket): SQL<string> =>
  sql<string>`strftime(${BUCKET_SQL_FORMATS[bucket]}, ${column} / ${MILLISECONDS_PER_SECOND}, 'unixepoch')`
