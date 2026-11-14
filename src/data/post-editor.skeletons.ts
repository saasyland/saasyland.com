import type { PageSkeleton } from "~/src/data/skeletons"

import { AdminBlogCreatePending, AdminBlogPending } from "~/src/presentation/components/custom/admin/post-editor-pending"

import { ROUTES } from "~/src/routes"

export const POST_EDITOR_SKELETONS = [
  { pendingComponent: AdminBlogPending, to: ROUTES.ADMIN_BLOG },
  { pendingComponent: AdminBlogCreatePending, to: ROUTES.ADMIN_BLOG_CREATE },
] as const satisfies readonly PageSkeleton[]
