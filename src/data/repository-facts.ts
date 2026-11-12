import facts from "virtual:repository-facts"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { CLI_CHOICES } from "~/src/data/cli"

export const REPOSITORY_FACTS = {
  ...facts,
  cliQuestions: CLI_CHOICES.length,
  languages: I18N.SUPPORTED_LOCALES.length,
}
