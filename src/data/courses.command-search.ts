import { BookOpen, GraduationCap } from "lucide-react"

import { searchCoursesQuery } from "~/src/modules/course/use-cases/search-courses"
import { searchLessonsQuery } from "~/src/modules/lesson/use-cases/search-lessons"

import type { CommandSearch } from "~/src/data/command-search"

const AREA = "courses"

export const COURSES_COMMAND_SEARCHES = [
  { area: AREA, icon: GraduationCap, key: "courses", order: 30, permission: { course: ["read"] }, query: searchCoursesQuery },
  { area: AREA, icon: BookOpen, key: "lessons", order: 40, permission: { course: ["read"] }, query: searchLessonsQuery },
] as const satisfies readonly CommandSearch[]
