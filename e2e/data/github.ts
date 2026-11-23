import * as zod from "zod"

const githubIdentitySchema = zod.object({
  email: zod.email(),
  id: zod.coerce.number().int().positive(),
  name: zod.string().min(1),
})

export type GitHubIdentity = zod.output<typeof githubIdentitySchema>

export const githubTestCode = ({ email, id, name }: GitHubIdentity): string =>
  new URLSearchParams({ email, id: String(id), name }).toString()

export const githubTestIdentity = (code: string): GitHubIdentity | undefined =>
  githubIdentitySchema.safeParse(Object.fromEntries(new URLSearchParams(code))).data
