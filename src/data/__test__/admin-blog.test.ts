import { expect, it } from "vite-plus/test"

import { ADMIN_BLOG_POST_STATUS, DUMMY_POSTS } from "~/src/data/admin-blog"

import pagesAdminBlogMessages from "~/messages/en-US/pages.admin.blog.json"

it("keeps demo blog records uniquely addressable", () => {
  expect(new Set(DUMMY_POSTS.map((post) => post.id)).size).toBe(DUMMY_POSTS.length)
  for (const post of DUMMY_POSTS) {
    expect(pagesAdminBlogMessages.demo.posts[post.id].title.length).toBeGreaterThan(0)
    expect(Object.values(ADMIN_BLOG_POST_STATUS)).toContain(post.status)
  }
})
