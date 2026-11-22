import * as zod from "zod"

const githubIdentitySchema = zod.object({
  email: zod.email(),
  id: zod.int().positive(),
  name: zod.string().min(1),
})

export type GitHubIdentity = zod.infer<typeof githubIdentitySchema>

export const githubTestCode = (identity: GitHubIdentity): string =>
  btoa(JSON.stringify(identity)).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "")

export const githubTestIdentity = (code: string): GitHubIdentity | undefined => {
  try {
    return githubIdentitySchema.parse(JSON.parse(atob(code.replaceAll("-", "+").replaceAll("_", "/"))))
  } catch {
    return undefined
  }
}
