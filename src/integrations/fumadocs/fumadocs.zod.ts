import zod from "zod/v4"

const MAX_CONTENT_SLUG_LENGTH = 2048

export const contentSlugSchema = zod
  .string()
  .max(MAX_CONTENT_SLUG_LENGTH)
  .regex(/^(?:[\p{L}\p{N}_-]+(?:\/[\p{L}\p{N}_-]+)*)?$/u)
