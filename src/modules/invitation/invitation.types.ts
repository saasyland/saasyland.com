import type * as zod from "zod"

import type { invitation } from "~/src/modules/invitation/invitation.schema"
import type { invitationZodSchemas } from "~/src/modules/invitation/invitation.zod"
import type { getInvitation } from "~/src/modules/invitation/use-cases/get-invitation"
import type { listInvitations } from "~/src/modules/invitation/use-cases/list-invitations"

export interface Invitation {
  select: typeof invitation.$inferSelect
  insert: typeof invitation.$inferInsert
  open: Awaited<ReturnType<typeof listInvitations>>[number]
  link: Awaited<ReturnType<typeof getInvitation>>
  acceptInvitation: zod.input<typeof invitationZodSchemas.acceptInvitation>
  claimInvitation: zod.input<typeof invitationZodSchemas.claimInvitation>
  createInvitation: zod.input<typeof invitationZodSchemas.createInvitation>
  getInvitation: zod.input<typeof invitationZodSchemas.getInvitation>
  resendInvitation: zod.input<typeof invitationZodSchemas.resendInvitation>
  revokeInvitation: zod.input<typeof invitationZodSchemas.revokeInvitation>
}
