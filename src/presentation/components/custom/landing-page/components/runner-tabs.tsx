import type { JSX } from "react"

import { useTranslations } from "use-intl/react"

import { PACKAGE_MANAGERS } from "~/src/data/cli"

import { cn } from "~/src/lib/cn"

import { ToggleGroup, ToggleGroupItem } from "~/src/presentation/components/shadcn/toggle-group"

interface RunnerTabsProps {
  readonly className: string
  readonly onSelect: (runner: (typeof PACKAGE_MANAGERS)[number]) => void
  readonly taken: string
}

export const RunnerTabs = ({ className, onSelect, taken }: RunnerTabsProps): JSX.Element => {
  const t = useTranslations("pages.landing.cli")

  return (
    <ToggleGroup
      aria-label={t("runner")}
      className={cn("w-full gap-1 rounded-none border-b border-border", className)}
      disallowEmptySelection
      onSelectionChange={(keys) => {
        for (const runner of PACKAGE_MANAGERS) {
          if (keys.has(runner.id)) {
            onSelect(runner)
          }
        }
      }}
      selectedKeys={[taken]}
      selectionMode="single"
    >
      {PACKAGE_MANAGERS.map((runner) => (
        <ToggleGroupItem
          className="h-auto min-w-0 cursor-pointer rounded-md py-1 font-mono text-spec font-normal text-muted-foreground transition-colors duration-200 ease-exp hover:bg-transparent hover:text-foreground data-focus-visible:outline-2 data-focus-visible:outline-offset-2 data-focus-visible:outline-ring data-selected:bg-muted data-selected:text-foreground"
          id={runner.id}
          key={runner.id}
        >
          {runner.id}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  )
}
