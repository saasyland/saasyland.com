import type { JSX } from "react"

import { AnimatePresence } from "motion/react"
import * as m from "motion/react-m"

import { PRESS } from "~/src/integrations/motion/motion.tokens"

const HIDDEN = { opacity: 0 }
const SHOWN = { opacity: 1 }

interface HighlightGlowProps {
  readonly isLit: boolean
  readonly name: string
}

export const HighlightGlow = ({ isLit, name }: HighlightGlowProps): JSX.Element => (
  <AnimatePresence>
    {isLit && (
      <m.div
        animate={SHOWN}
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-muted/45"
        exit={HIDDEN}
        initial={HIDDEN}
        key={name}
        layoutId={name}
        transition={PRESS}
      />
    )}
  </AnimatePresence>
)
