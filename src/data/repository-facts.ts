import { STACK_EXTRAS, STACK_MODULES } from "@saasyland/stack"
import facts from "virtual:repository-facts"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { HEAD_START_HIGH_HOURS, HEAD_START_HOURS, HEAD_START_LOW_HOURS } from "~/src/data/head-start"
import { ADMIN_NAVIGATION } from "~/src/data/navigation"
import { FEATURE_STATUS } from "~/src/data/navigation.constants"

export const REPOSITORY_FACTS = {
  ...facts,
  adminSections: ADMIN_NAVIGATION.flatMap(({ items }) => items).filter(({ status }) => status === FEATURE_STATUS.AVAILABLE).length,
  cliExtras: STACK_EXTRAS.length,
  cliModules: STACK_MODULES.length,
  cliOptionalModules: STACK_MODULES.filter((module) => "choiceId" in module).length,
  headStartHighHours: HEAD_START_HIGH_HOURS,
  headStartHours: HEAD_START_HOURS,
  headStartLowHours: HEAD_START_LOW_HOURS,
  languages: I18N.SUPPORTED_LOCALES.length,
}
