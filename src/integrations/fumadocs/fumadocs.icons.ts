import { type ReactNode, createElement } from "react"

import { BookOpen, Info, Library, type LucideIcon, Network, Palette, Plug, Rocket, Ruler, Sparkles, Terminal, Wrench } from "lucide-react"

export const DOCS_ICONS: Readonly<Record<string, LucideIcon>> = {
  BookOpen,
  Info,
  Library,
  Network,
  Palette,
  Plug,
  Rocket,
  Ruler,
  Sparkles,
  Terminal,
  Wrench,
}

export const docsIcon = (name: string | undefined): ReactNode => {
  const Icon = Object.entries(DOCS_ICONS).find(([iconName]) => iconName === name)?.[1]

  return Icon && createElement(Icon)
}
