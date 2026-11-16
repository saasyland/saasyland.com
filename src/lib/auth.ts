import { OAUTH_CLIENTS, OAUTH_PROVIDERS } from "~/src/data/auth"

export const verifyAuth = ({
  file,
  values,
}: {
  readonly file: string
  readonly values: Readonly<Record<string, string | undefined>>
}): string => {
  const clients = OAUTH_PROVIDERS.map(({ id, name }) => {
    const { clientIdFormat, clientIdVariable } = OAUTH_CLIENTS[id]

    return { name, valid: clientIdFormat.test(values[clientIdVariable] ?? ""), variable: clientIdVariable }
  })
  const invalid = clients.filter(({ valid }) => !valid)

  if (invalid.length > 0) {
    throw new Error(invalid.map(({ name, variable }) => `${variable} in ${file} is not a ${name} OAuth client ID.`).join("\n"))
  }

  return clients.map(({ name, variable }) => `${variable} in ${file} is a ${name} OAuth client ID.`).join("\n")
}
