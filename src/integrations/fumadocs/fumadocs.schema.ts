import { pageSchema } from "fumadocs-core/source/schema"
import zod from "zod/v4"

import { BLOG_TAGS } from "../../data/blog"

const blogDateSchema = zod.union([zod.string(), zod.date()])

const blogFaqSchema = zod.array(zod.object({ answer: zod.string(), question: zod.string() }))

export const blogSchema = pageSchema.extend({
  authorImage: zod.string().optional(),
  authorName: zod.string(),
  date: blogDateSchema,
  excerpt: zod.string().optional(),
  faq: blogFaqSchema.optional(),
  featured: zod.boolean().optional(),
  image: zod.string().optional(),
  published: zod.boolean().default(true),
  tags: zod.array(zod.enum(BLOG_TAGS)).optional(),
  updated: blogDateSchema.optional(),
})
