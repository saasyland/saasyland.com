import { pageSchema } from "fumadocs-core/source/schema"
import zod from "zod/v4"

import { BLOG_AUTHOR, BLOG_TAGS } from "../../data/blog"

const blogDateSchema = zod.union([zod.iso.date(), zod.date()])

const blogFaqSchema = zod.array(zod.object({ answer: zod.string(), question: zod.string() }))

export const blogSchema = pageSchema
  .extend({
    author: zod.enum(BLOG_AUTHOR),
    date: blogDateSchema,
    excerpt: zod.string().optional(),
    faq: blogFaqSchema.optional(),
    image: zod.string().optional(),
    published: zod.boolean().default(true),
    tags: zod.array(zod.enum(BLOG_TAGS)).optional(),
    updated: blogDateSchema.optional(),
  })
  .refine(({ date, updated }) => updated === undefined || new Date(updated).getTime() >= new Date(date).getTime(), {
    error: "updated is earlier than date, the first publication",
    path: ["updated"],
  })
