export const LESSON_PROGRESS_MUTATION_KEYS = {
  SAVE: ["lessonProgress", "saveLessonProgress"],
} as const

export const LESSON_PROGRESS_QUERY_KEYS = {
  ALL: ["lessonProgress"],
  COMPLETED_LESSONS: ["lessonProgress", "getCompletedLessons"],
  COURSE_PROGRESS: ["lessonProgress", "getCourseProgress"],
} as const
