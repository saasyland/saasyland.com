import { FLOW_FEATURE, FLOW_STATUS, type Flow } from "./flows"

export const POST_EDITOR_FLOWS = [
  {
    feature: FLOW_FEATURE.ADMIN_BLOG,
    id: "admin-blog-list",
    outcome: "/admin/blog lists the published posts with their languages and dates",
    reason: "There is no admin blog screen; posts are MDX files in content/blog.",
    status: FLOW_STATUS.TO_BUILD,
  },
  {
    feature: FLOW_FEATURE.ADMIN_BLOG,
    id: "admin-blog-write",
    outcome: "The admin writes and publishes a post, and it appears on /blog",
    reason: "There is no post editor; posts are MDX files in content/blog.",
    status: FLOW_STATUS.TO_BUILD,
  },
] as const satisfies readonly Flow[]
