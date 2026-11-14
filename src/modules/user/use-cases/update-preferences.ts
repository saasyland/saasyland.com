import { mutationOptions } from "@tanstack/react-query"
import { createServerFn } from "@tanstack/react-start"

import { authorized } from "~/src/integrations/better-auth/auth.middleware"
import { auth } from "~/src/integrations/better-auth/auth.server"

import { USER_MUTATION_KEYS } from "~/src/modules/user/user.constants"
import type { User } from "~/src/modules/user/user.types"
import { userZodSchemas } from "~/src/modules/user/user.zod"

export const updatePreferences = createServerFn({ method: "POST" })
  .middleware([authorized()])
  .validator((input: User["updatePreferences"]) => userZodSchemas.updatePreferences.parse(input))
  .handler(({ context, data }) => auth.api.updateUser({ body: data, headers: context.requestHeaders }))

export const updatePreferencesMutation = mutationOptions({
  mutationFn: (data: User["updatePreferences"]) => updatePreferences({ data }),
  mutationKey: USER_MUTATION_KEYS.UPDATE_PREFERENCES,
})
