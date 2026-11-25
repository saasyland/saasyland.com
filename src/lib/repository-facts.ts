import { NONE, STACK_EXTRAS, STACK_MODULES } from "@saasyland/stack"
import facts from "virtual:repository-facts"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { CLI_TEMPLATE_SUPPORT } from "~/src/data/cli"
import { HEAD_START_HIGH_HOURS, HEAD_START_HOURS, HEAD_START_LOW_HOURS } from "~/src/data/head-start"
import { ADMIN_NAVIGATION } from "~/src/data/navigation"

import { NONCE_LENGTH } from "~/src/lib/content-security-policy"
import { HEX_DIGITS_PER_BYTE } from "~/src/lib/hex"

const BITS_PER_BYTE = 8

const NONCE_BYTES = NONCE_LENGTH / HEX_DIGITS_PER_BYTE

export const REPOSITORY_FACTS = {
  ...facts,
  adminSections: ADMIN_NAVIGATION.flatMap(({ items }) => items).length,
  cliExtras: STACK_EXTRAS.length,
  cliGeneratedModules: STACK_MODULES.filter(
    (module) => !("choiceId" in module) || CLI_TEMPLATE_SUPPORT.choices[module.choiceId].some((option) => option !== NONE),
  ).length,
  cliModules: STACK_MODULES.length,
  cliOptionalModules: STACK_MODULES.filter((module) => "choiceId" in module).length,
  headStartHighHours: HEAD_START_HIGH_HOURS,
  headStartHours: HEAD_START_HOURS,
  headStartLowHours: HEAD_START_LOW_HOURS,
  languages: I18N.SUPPORTED_LOCALES.length,
  nonceBits: NONCE_BYTES * BITS_PER_BYTE,
  nonceBytes: NONCE_BYTES,
  nonceHexCharacters: NONCE_LENGTH,
}
