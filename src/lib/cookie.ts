type SameSite = "Lax" | "None" | "Strict"

export interface CookieOptions {
  httpOnly?: boolean
  maxAge?: number
  path?: string
  sameSite?: SameSite
  secure?: boolean
}

const ONE_YEAR_IN_SECONDS = 31_536_000
const DEFAULT_PATH = "/"
const DEFAULT_SAME_SITE: SameSite = "Lax"

const ENTRY_DELIMITER = ";"
const ATTRIBUTE_DELIMITER = `${ENTRY_DELIMITER} `
const KEY_VALUE_DELIMITER = "="

const KEY_VALUE_DELIMITER_LENGTH = KEY_VALUE_DELIMITER.length

interface Cookie {
  readonly name: string
  readonly value: string
}

const cookiesOf = (header: string): Cookie[] =>
  header.split(ENTRY_DELIMITER).flatMap((entry) => {
    const separator = entry.indexOf(KEY_VALUE_DELIMITER)

    if (separator <= 0) {
      return []
    }

    return [{ name: entry.slice(0, separator).trim(), value: entry.slice(separator + KEY_VALUE_DELIMITER_LENGTH).trim() }]
  })

const decodedValue = ({ value }: Cookie): string[] => {
  try {
    return [decodeURIComponent(value)]
  } catch {
    return []
  }
}

export const readCookie = ({ header, name }: { header: string | null | undefined; name: string }): string | undefined =>
  cookiesOf(header ?? "")
    .filter((cookie) => cookie.name === name)
    .slice(0, 1)
    .flatMap((cookie) => decodedValue(cookie))
    .at(0)

export const serializeCookie = ({ name, options = {}, value }: { name: string; options?: CookieOptions; value: string }): string => {
  const { httpOnly = false, maxAge = ONE_YEAR_IN_SECONDS, path = DEFAULT_PATH, sameSite = DEFAULT_SAME_SITE } = options

  const secure = sameSite === "None" || (options.secure ?? import.meta.env.PROD)
  const attributes = [`${name}=${encodeURIComponent(value)}`, `Path=${path}`, `Max-Age=${maxAge}`, `SameSite=${sameSite}`]

  if (secure) {
    attributes.push("Secure")
  }

  if (httpOnly) {
    attributes.push("HttpOnly")
  }

  return attributes.join(ATTRIBUTE_DELIMITER)
}
