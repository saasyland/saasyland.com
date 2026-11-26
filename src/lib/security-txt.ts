import { SECURITY_TXT_EXPIRES, SECURITY_TXT_LANGUAGES } from "~/src/data/security"

import { APP_URL, CONTACT_EMAIL } from "~/src/presentation/branding"
import { ROUTES } from "~/src/routes"

export const SECURITY_TXT_FIELD = {
  CANONICAL: "Canonical",
  CONTACT: "Contact",
  EXPIRES: "Expires",
  POLICY: "Policy",
  PREFERRED_LANGUAGES: "Preferred-Languages",
} as const

const LANGUAGE_SEPARATOR = ", "

const FIELDS: readonly string[] = [
  `${SECURITY_TXT_FIELD.CONTACT}: mailto:${CONTACT_EMAIL}`,
  `${SECURITY_TXT_FIELD.EXPIRES}: ${SECURITY_TXT_EXPIRES}`,
  `${SECURITY_TXT_FIELD.PREFERRED_LANGUAGES}: ${SECURITY_TXT_LANGUAGES.join(LANGUAGE_SEPARATOR)}`,
  `${SECURITY_TXT_FIELD.CANONICAL}: ${APP_URL}${ROUTES.WELL_KNOWN.SECURITY_TXT}`,
  `${SECURITY_TXT_FIELD.POLICY}: ${APP_URL}${ROUTES.DOCS.PROJECT.SECURITY_POLICY}`,
]

export const SECURITY_TXT_CONTENT = FIELDS.map((field) => `${field}\n`).join("")
