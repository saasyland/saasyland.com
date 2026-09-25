import { type JSX, type ReactNode, createContext, use, useMemo, useState } from "react"

import { AnimatePresence } from "motion/react"
import * as m from "motion/react-m"

import { PRESS } from "~/src/integrations/motion/motion.tokens"

import { cn } from "~/src/lib/cn"

import { ConceptLoop, type ConceptLoopName } from "~/src/presentation/components/custom/landing-page/components/concept-loop"

const HIGHLIGHT_ID = "line-station-highlight"

const HIDDEN = { opacity: 0 }
const SHOWN = { opacity: 1 }

const STATION_IMAGE_SIZES =
  "(min-width: 80rem) calc((80rem - 5rem - 3px) / 2 - 5rem), (min-width: 64rem) calc((100vw - 5rem - 3px) / 2 - 5rem), (min-width: 48rem) calc(100vw - 10rem - 2px), calc(100vw - 6.5rem - 2px)"

interface StationGridState {
  readonly hovered?: string | undefined
  readonly setHovered: (id?: string) => void
}

const ignoreHover = (): void => {}

const StationGridContext = createContext<StationGridState>({ setHovered: ignoreHover })

interface StationGridProps {
  readonly children: ReactNode
}

export const StationGrid = ({ children }: StationGridProps): JSX.Element => {
  const [hovered, setHovered] = useState<string>()
  const state = useMemo<StationGridState>(() => ({ hovered, setHovered }), [hovered])

  return (
    <StationGridContext value={state}>
      <div
        className="grid gap-px overflow-hidden rounded-xl border border-border bg-border lg:grid-cols-2"
        onMouseLeave={() => {
          setHovered(undefined)
        }}
      >
        {children}
      </div>
    </StationGridContext>
  )
}

interface SpecChipProps {
  readonly label: string
}

const SpecChip = ({ label }: SpecChipProps): JSX.Element => (
  <p className="mt-auto flex items-center gap-2.5 pt-8">
    <span aria-hidden className="size-1.25 shrink-0 rounded-xs bg-ring" />
    <span className="font-mono text-spec text-foreground">{label}</span>
  </p>
)

interface StationCellProps {
  readonly body: string
  readonly id: string
  readonly loop: ConceptLoopName
  readonly offsetSeconds: number
  readonly spec: string
  readonly title: string
}

export const StationCell = ({ body, id, loop, offsetSeconds, spec, title }: StationCellProps): JSX.Element => {
  const { hovered, setHovered } = use(StationGridContext)
  const isLit = hovered === id

  return (
    <div
      className={cn("relative bg-background", { "z-10": isLit })}
      onMouseEnter={() => {
        setHovered(id)
      }}
    >
      <AnimatePresence>
        {isLit && (
          <m.div
            animate={SHOWN}
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-muted/45"
            exit={HIDDEN}
            initial={HIDDEN}
            key={HIGHLIGHT_ID}
            layoutId={HIGHLIGHT_ID}
            transition={PRESS}
          />
        )}
      </AnimatePresence>

      <div className="relative flex h-full flex-col p-7 md:p-10">
        <h3 className="text-headline-support text-balance text-foreground">{title}</h3>
        <p
          className={cn("mt-4 max-w-[44ch] text-body text-pretty transition-colors duration-400 ease-exp", {
            "text-foreground": isLit,
            "text-muted-foreground": !isLit,
          })}
        >
          {body}
        </p>
        <SpecChip label={spec} />
        <ConceptLoop className="mt-7 max-sm:hidden md:mt-9" name={loop} offsetSeconds={offsetSeconds} sizes={STATION_IMAGE_SIZES} />
      </div>
    </div>
  )
}
