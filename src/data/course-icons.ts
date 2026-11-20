import { BookOpen, Bot, Code, Layers, type LucideIcon, MapIcon, MessagesSquare, Rocket, Scale, ShieldCheck, Sparkles } from "lucide-react"

import { COURSE_ICON, type CourseIcon } from "~/src/modules/course/course.constants"

export const COURSE_ICON_COMPONENTS = {
  [COURSE_ICON.BOOK_OPEN]: BookOpen,
  [COURSE_ICON.BOT]: Bot,
  [COURSE_ICON.CODE]: Code,
  [COURSE_ICON.LAYERS]: Layers,
  [COURSE_ICON.MAP]: MapIcon,
  [COURSE_ICON.MESSAGES_SQUARE]: MessagesSquare,
  [COURSE_ICON.ROCKET]: Rocket,
  [COURSE_ICON.SCALE]: Scale,
  [COURSE_ICON.SHIELD_CHECK]: ShieldCheck,
  [COURSE_ICON.SPARKLES]: Sparkles,
} as const satisfies Record<CourseIcon, LucideIcon>
