import type { JSX } from "react"

import { useTranslations } from "use-intl/react"

import { CopyButton } from "~/src/presentation/components/custom/copy-button"

interface CommandLineProps {
  readonly copyLabel: string
  readonly isCommand: boolean
  readonly onCopy?: () => void
  readonly value: string
}

export const CommandLine = ({ copyLabel, isCommand, onCopy, value }: CommandLineProps): JSX.Element => {
  const t = useTranslations("pages.license.copy")

  return (
    <div className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-border bg-muted/40 py-1.5 pr-1.5 pl-3">
      <code className="min-w-0 overflow-x-auto font-mono text-sm whitespace-nowrap text-foreground select-all">
        {isCommand && (
          <span aria-hidden className="mr-2 text-muted-foreground/60 select-none">
            $
          </span>
        )}
        {value}
      </code>
      <CopyButton copiedLabel={t("copied")} copyLabel={copyLabel} value={value} {...(onCopy === undefined ? {} : { onCopy })} />
    </div>
  )
}
