import type { JSX } from "react"

import defaultMdxComponents from "@fumadocs/base-ui/mdx"

import { type CLI_CHOICES, PACKAGE_MANAGER, SCAFFOLD_TARGET } from "~/src/data/cli"

type ScaffoldFlag = (typeof CLI_CHOICES)[number]["options"][number]["flag"]

const CONTINUED_LINE = " \\\n  "

export const ScaffoldCommand = ({ flags }: { readonly flags: readonly ScaffoldFlag[] }): JSX.Element => (
  <defaultMdxComponents.pre>
    <code>{[`${PACKAGE_MANAGER.BUN.exec} ${SCAFFOLD_TARGET}`, ...flags].join(CONTINUED_LINE)}</code>
  </defaultMdxComponents.pre>
)
