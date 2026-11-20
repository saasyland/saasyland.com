import type { JSX } from "react"

import defaultMdxComponents from "@fumadocs/base-ui/mdx"
import { stackArguments } from "@saasyland/stack"

import { CLI_TEMPLATE_SUPPORT, PACKAGE_MANAGER, SCAFFOLD_TARGET, resolveCliAnswers } from "~/src/data/cli"

const CONTINUED_LINE = " \\\n  "

const OPENING_FLAGS = stackArguments(resolveCliAnswers({}, CLI_TEMPLATE_SUPPORT.choices))

export const ScaffoldCommand = (): JSX.Element => (
  <defaultMdxComponents.pre>
    <code>{[`${PACKAGE_MANAGER.BUN.exec} ${SCAFFOLD_TARGET}`, ...OPENING_FLAGS].join(CONTINUED_LINE)}</code>
  </defaultMdxComponents.pre>
)
