import type { JSX } from "react"

import defaultMdxComponents from "@fumadocs/base-ui/mdx"

import { CLI_TEMPLATE_SUPPORT, PACKAGE_MANAGER, SCAFFOLD_TARGET, cliFlags, resolveCliAnswers } from "~/src/data/cli"

const CONTINUED_LINE = " \\\n  "

const OPENING_FLAGS = cliFlags(resolveCliAnswers({}, CLI_TEMPLATE_SUPPORT.choices))

export const ScaffoldCommand = (): JSX.Element => (
  <defaultMdxComponents.pre>
    <code>{[`${PACKAGE_MANAGER.BUN.exec} ${SCAFFOLD_TARGET}`, ...OPENING_FLAGS].join(CONTINUED_LINE)}</code>
  </defaultMdxComponents.pre>
)
