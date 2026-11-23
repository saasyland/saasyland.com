import * as zod from "zod"

import { localeField } from "~/src/modules/_core/utils/zod-fields"

export const SEARCH_TEXT_MIN_LENGTH = 2

export const SEARCH_TEXT_MAX_LENGTH = 100

export const SEARCH_HITS_LIMIT = 5

export const SEARCH_STALE_MS = 30_000

export const searchSchema = zod.object({
  text: zod.string().trim().min(SEARCH_TEXT_MIN_LENGTH).max(SEARCH_TEXT_MAX_LENGTH),
})

export const localizedSearchSchema = searchSchema.extend({ locale: localeField })

export interface SearchHit {
  readonly detail: string
  readonly id: string
  readonly title: string
  readonly to: string
}
