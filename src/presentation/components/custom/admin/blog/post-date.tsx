import { useFormatter, useTranslations } from "use-intl/react"

import type { DUMMY_POSTS } from "~/src/data/admin-blog"

export const PostDate = ({ post }: { readonly post: (typeof DUMMY_POSTS)[number] }): string => {
  const t = useTranslations("pages.admin.blog.demo.dates")
  const format = useFormatter()

  if (post.status === "published") {
    return format.dateTime(new Date(post.date), { day: "numeric", month: "short" })
  }

  return t(post.status)
}
