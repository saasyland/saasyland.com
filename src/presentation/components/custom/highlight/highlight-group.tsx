import { type ComponentProps, type JSX, createContext, useMemo, useState } from "react"

type HighlightElement = "div" | "dl"

export interface HighlightState {
  readonly element: HighlightElement
  readonly hovered?: string | undefined
  readonly name: string
  readonly setHovered: (id?: string) => void
}

const ignoreHover = (): void => {}

export const HighlightContext = createContext<HighlightState>({ element: "div", name: "", setHovered: ignoreHover })

type HighlightGroupProps = Required<Pick<ComponentProps<"div">, "children" | "className">> & {
  readonly element?: HighlightElement
  readonly name: string
}

export const HighlightGroup = ({ children, className, element = "div", name }: HighlightGroupProps): JSX.Element => {
  const [hovered, setHovered] = useState<string>()
  const state = useMemo<HighlightState>(() => ({ element, hovered, name, setHovered }), [element, hovered, name])

  const leave = (): void => {
    setHovered(undefined)
  }

  return (
    <HighlightContext value={state}>
      {element === "dl" ? (
        <div onMouseLeave={leave}>
          <dl className={className}>{children}</dl>
        </div>
      ) : (
        <div className={className} onMouseLeave={leave}>
          {children}
        </div>
      )}
    </HighlightContext>
  )
}
