import { type SQL, sql } from "drizzle-orm"
import type { SQLiteColumn } from "drizzle-orm/sqlite-core"

import { MILLISECONDS_PER_SECOND } from "~/src/lib/duration"
import { BUCKET_SQL_FORMATS, type TimeBucket } from "~/src/lib/time-series"

export const bucketOf = (column: SQLiteColumn, bucket: TimeBucket): SQL<string> =>
  sql<string>`strftime(${BUCKET_SQL_FORMATS[bucket]}, ${column} / ${MILLISECONDS_PER_SECOND}, 'unixepoch')`
