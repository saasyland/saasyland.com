import facts from "virtual:repository-facts"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { CLI_CHOICES, CLI_EXTRAS, CLI_MODULES } from "~/src/data/cli"

export const REPOSITORY_FACTS = {
  ...facts,
  cliExtras: CLI_EXTRAS.length,
  cliModules: CLI_MODULES.length,
  cliOptionalModules: CLI_MODULES.filter((module) => "choiceId" in module).length,
  cliQuestions: CLI_CHOICES.length,
  languages: I18N.SUPPORTED_LOCALES.length,
}
