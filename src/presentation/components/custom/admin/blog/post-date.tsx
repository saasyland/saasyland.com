import { useFormatter, useTranslations } from "use-intl/react"

import { ADMIN_BLOG_POST_STATUS, type DUMMY_POSTS } from "~/src/data/admin-blog"

export const PostDate = ({ post }: { readonly post: (typeof DUMMY_POSTS)[number] }): string => {
  const t = useTranslations("pages.admin.blog.demo.dates")
  const format = useFormatter()

  if (post.status === ADMIN_BLOG_POST_STATUS.PUBLISHED) {
    return format.dateTime(new Date(post.date), "calendarDate")
  }

  return t(post.status)
}
