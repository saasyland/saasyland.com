import { SwitchButton, SwitchField, type SwitchFieldProps, composeRenderProps } from "react-aria-components"

import { cn } from "~/src/lib/cn"

const SELECTED_THUMB = { "data-selected": true } as const

const Switch = ({
  children,
  className,
  size = "default",
  ...props
}: Omit<SwitchFieldProps, "className"> & {
  className?: string
  size?: "sm" | "default"
}) => (
  <SwitchField data-size={size} data-slot="switch" {...props}>
    <SwitchButton
      className={cn("group/switch inline-flex items-center gap-2 outline-none data-disabled:cursor-not-allowed", className)}
      data-size={size}
      data-slot="switch-button"
    >
      {composeRenderProps(children, (renderedChildren, { isSelected }) => (
        <>
          <span
            className="relative inline-flex shrink-0 items-center rounded-full border border-transparent bg-input transition-all group-data-focus-visible/switch:border-ring group-data-focus-visible/switch:ring-3 group-data-focus-visible/switch:ring-ring/50 group-data-invalid/switch:border-destructive group-data-invalid/switch:ring-3 group-data-invalid/switch:ring-destructive/20 group-data-[size=default]/switch:h-[18.4px] group-data-[size=default]/switch:w-[32px] group-data-[size=sm]/switch:h-[14px] group-data-[size=sm]/switch:w-[24px] group-data-selected/switch:bg-primary group-data-disabled/switch:opacity-50 after:absolute after:-inset-x-3 after:-inset-y-2 dark:bg-input/80 dark:group-data-invalid/switch:border-destructive/50 dark:group-data-invalid/switch:ring-destructive/40 dark:group-data-selected/switch:bg-primary"
            data-slot="switch-track"
          >
            <span
              className="pointer-events-none block rounded-full bg-background ring-0 transition-transform group-data-[size=default]/switch:size-4 group-data-[size=default]/switch:not-data-selected:translate-x-0 group-data-[size=sm]/switch:size-3 group-data-[size=sm]/switch:not-data-selected:translate-x-0 dark:not-data-selected:bg-foreground group-data-[size=default]/switch:data-selected:translate-x-[calc(100%-2px)] group-data-[size=sm]/switch:data-selected:translate-x-[calc(100%-2px)] dark:data-selected:bg-primary-foreground"
              {...(isSelected && SELECTED_THUMB)}
              data-slot="switch-thumb"
            />
          </span>
          {renderedChildren}
        </>
      ))}
    </SwitchButton>
  </SwitchField>
)

export { Switch }
