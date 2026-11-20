import type { QueryClient } from "@tanstack/react-query"

import { courseProgressQuery } from "~/src/modules/lesson-progress/use-cases/get-course-progress"
import { getVideosQuery } from "~/src/modules/video/use-cases/get-videos"

export const seedCoursesQueries = (queryClient: QueryClient): void => {
  queryClient.setQueryData(courseProgressQuery.queryKey, { learners: 0, rows: [] })
  queryClient.setQueryData(getVideosQuery.queryKey, { rows: [], total: 0 })
}
