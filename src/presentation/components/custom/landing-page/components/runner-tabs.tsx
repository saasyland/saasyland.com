import type { JSX } from "react"

import { PACKAGE_MANAGERS } from "~/src/data/cli"

import { cn } from "~/src/lib/cn"

interface RunnerTabsProps {
  readonly className?: string | undefined
  readonly label: string
  readonly onSelect: (runner: (typeof PACKAGE_MANAGERS)[number]) => void
  readonly taken: string
}

export const RunnerTabs = ({ className, label, onSelect, taken }: RunnerTabsProps): JSX.Element => (
  <div aria-label={label} className={cn("flex items-center gap-1 border-b border-border", className)} role="tablist">
    {PACKAGE_MANAGERS.map((runner) => (
      <button
        aria-selected={runner.id === taken}
        className={cn(
          "cursor-pointer rounded-md px-2.5 py-1 font-mono text-spec transition-colors duration-200 ease-exp focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
          {
            "bg-muted text-foreground": runner.id === taken,
            "text-muted-foreground hover:text-foreground": runner.id !== taken,
          },
        )}
        key={runner.id}
        onClick={() => {
          onSelect(runner)
        }}
        role="tab"
        type="button"
      >
        {runner.id}
      </button>
    ))}
  </div>
)
