import { type ComponentProps, type JSX, createContext, use, useMemo, useState } from "react"

import { AnimatePresence } from "motion/react"
import * as m from "motion/react-m"

import { PRESS } from "~/src/integrations/motion/motion.tokens"

import { cn } from "~/src/lib/cn"

type HighlightElement = "div" | "dl" | "ul"

interface HighlightState {
  readonly element: HighlightElement
  readonly hovered?: string | undefined
  readonly name: string
  readonly setHovered: (id?: string) => void
}

const ITEM_ELEMENTS = { div: "div", ul: "li" } as const

const HIDDEN = { opacity: 0 }
const SHOWN = { opacity: 1 }

const ignoreHover = (): void => {}

const HighlightContext = createContext<HighlightState>({ element: "div", name: "", setHovered: ignoreHover })

type HighlightGroupProps = Pick<ComponentProps<"div">, "children"> &
  Required<Pick<ComponentProps<"div">, "className">> & {
    readonly element?: HighlightElement
    readonly name: string
  }

export const HighlightGroup = ({ children, className, element = "div", name }: HighlightGroupProps): JSX.Element => {
  const [hovered, setHovered] = useState<string>()
  const state = useMemo<HighlightState>(() => ({ element, hovered, name, setHovered }), [element, hovered, name])

  const leave = (): void => {
    setHovered(undefined)
  }

  if (element === "div") {
    return (
      <HighlightContext value={state}>
        <div className={cn("isolate", className)} onMouseLeave={leave}>
          {children}
        </div>
      </HighlightContext>
    )
  }

  const List = element

  return (
    <HighlightContext value={state}>
      <div onMouseLeave={leave}>
        <List className={cn("isolate", className)}>{children}</List>
      </div>
    </HighlightContext>
  )
}

const HighlightGlow = ({ isLit, name }: Readonly<{ isLit: boolean; name: string }>): JSX.Element => (
  <AnimatePresence>
    {isLit && (
      <m.div
        animate={SHOWN}
        aria-hidden
        className="pointer-events-none absolute inset-0 z-10 rounded-[inherit] bg-muted/45"
        exit={HIDDEN}
        initial={HIDDEN}
        key={name}
        layoutId={name}
        transition={PRESS}
      />
    )}
  </AnimatePresence>
)

type HighlightItemProps = Pick<ComponentProps<"div">, "children" | "className"> & {
  readonly contentClassName?: string
  readonly id: string
}

export const HighlightItem = ({ children, className, contentClassName, id }: HighlightItemProps): JSX.Element => {
  const { element, hovered, name, setHovered } = use(HighlightContext)
  const isLit = hovered === id

  const enter = (): void => {
    setHovered(id)
  }

  if (element === "dl") {
    return (
      <div
        className={cn("relative [&>dd]:relative [&>dd]:z-20 [&>dt]:relative [&>dt]:z-20", className, contentClassName)}
        onMouseEnter={enter}
      >
        <HighlightGlow isLit={isLit} name={name} />
        {children}
      </div>
    )
  }

  const Item = ITEM_ELEMENTS[element]

  return (
    <Item className={cn("relative", className)} onMouseEnter={enter}>
      <HighlightGlow isLit={isLit} name={name} />
      <div className={cn("relative z-20", contentClassName)}>{children}</div>
    </Item>
  )
}
