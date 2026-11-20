import { FLOW_AREA, FLOW_STATUS, type Flow } from "./flows"

export const POST_EDITOR_FLOWS = [
  {
    area: FLOW_AREA.ADMIN_BLOG,
    id: "admin-blog-list",
    outcome: "/admin/blog lists the published posts with their languages and dates",
    reason: "The page shows the DUMMY_POSTS of src/data/admin-blog.ts.",
    status: FLOW_STATUS.TO_BUILD,
  },
  {
    area: FLOW_AREA.ADMIN_BLOG,
    id: "admin-blog-write",
    outcome: "The admin writes and publishes a post, and it appears on /blog",
    reason: "The editor saves nothing; posts are MDX files in content/blog.",
    status: FLOW_STATUS.TO_BUILD,
  },
] as const satisfies readonly Flow[]
