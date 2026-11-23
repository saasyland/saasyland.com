import * as zod from "zod"

import { ROLE_VALUES } from "~/src/integrations/better-auth/auth.roles"
import { emailSchema, nameSchema, strictPasswordSchema } from "~/src/integrations/better-auth/auth.zod"

import { idField, localeField } from "~/src/modules/_core/utils/zod-fields"
import { INVITATION_TOKEN_LENGTH } from "~/src/modules/invitation/invitation.constants"

const tokenField = zod.string().length(INVITATION_TOKEN_LENGTH)

export const invitationZodSchemas = {
  acceptInvitation: zod.object({ name: nameSchema, password: strictPasswordSchema, token: tokenField }),
  claimInvitation: zod.object({ token: tokenField }),
  createInvitation: zod.object({ email: emailSchema, locale: localeField, role: zod.enum(ROLE_VALUES) }),
  getInvitation: zod.object({ token: tokenField }),
  resendInvitation: zod.object({ id: idField }),
  revokeInvitation: zod.object({ id: idField }),
}
