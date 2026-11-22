import zod from "zod/v4"

import { MOVE_DIRECTIONS } from "~/src/modules/_core/constants/ordering"
import { localizedListSchema, localizedTextSchema } from "~/src/modules/_core/utils/localized-text"
import { paginationSchema } from "~/src/modules/_core/utils/pagination"
import { localizedSearchSchema } from "~/src/modules/_core/utils/search"
import { MIN_FIELD_LENGTH, idField, localeField, slugField } from "~/src/modules/_core/utils/zod-fields"
import { chapterZodSchemas } from "~/src/modules/chapter/chapter.zod"
import {
  COURSE_DOCUMENT,
  COURSE_DOCUMENT_MAX_LENGTH,
  COURSE_ICONS,
  COURSE_KINDS,
  COURSE_LEVELS,
  COURSE_STATUSES,
} from "~/src/modules/course/course.constants"
import {
  COURSE_COVER_MAX_BYTES,
  COURSE_COVER_SOURCE_TYPES,
  COURSE_COVER_STORED_TYPES,
  COURSE_COVER_WIDTHS,
  coverEntries,
  coverExtension,
} from "~/src/modules/course/course.cover"
import { lessonAttachmentZodSchemas } from "~/src/modules/lesson-attachment/lesson-attachment.zod"
import { lessonZodSchemas } from "~/src/modules/lesson/lesson.zod"

const courseIdInput = zod.object({
  courseId: idField,
})

const courseFields = zod.object({
  icon: zod.enum(COURSE_ICONS),
  kind: zod.enum(COURSE_KINDS),
  level: zod.enum(COURSE_LEVELS),
  outcomes: localizedListSchema,
  prerequisites: localizedListSchema,
  slug: slugField,
  status: zod.enum(COURSE_STATUSES),
  summary: localizedTextSchema,
  title: localizedTextSchema,
})

const createCourse = courseFields

const documentLink = zod.strictObject(lessonAttachmentZodSchemas.createLessonAttachment.omit({ lessonId: true }).shape)

const documentLesson = zod.strictObject({
  ...lessonZodSchemas.updateLesson.omit({ lessonId: true }).shape,
  links: zod.array(documentLink),
  videoId: lessonZodSchemas.createLesson.shape.videoId,
})

const documentChapter = zod.strictObject({
  ...chapterZodSchemas.createChapter.omit({ courseId: true }).shape,
  lessons: zod.array(documentLesson),
})

const documentCourse = zod.strictObject({
  ...courseFields.shape,
  chapters: zod.array(documentChapter),
})

interface SlugEntry {
  readonly path: (number | string)[]
  readonly slug: string
}

const repeatedSlugs = (entries: readonly SlugEntry[]): SlugEntry[] =>
  entries.filter((entry, index) => entries.findIndex(({ slug }) => slug === entry.slug) !== index)

const courseSlugs = (courses: readonly zod.output<typeof documentCourse>[]): SlugEntry[] =>
  courses.map((course, courseIndex) => ({ path: ["courses", courseIndex, "slug"], slug: course.slug }))

const lessonSlugs = (course: zod.output<typeof documentCourse>, courseIndex: number): SlugEntry[] =>
  course.chapters.flatMap((chapter, chapterIndex) =>
    chapter.lessons.map((lesson, lessonIndex) => ({
      path: ["courses", courseIndex, "chapters", chapterIndex, "lessons", lessonIndex, "slug"],
      slug: lesson.slug,
    })),
  )

const courseDocument = zod
  .strictObject({
    courses: zod.array(documentCourse),
    format: zod.literal(COURSE_DOCUMENT.FORMAT, { message: "documentFormat" }),
    version: zod.literal(COURSE_DOCUMENT.VERSION, { message: "documentVersion" }),
  })
  .superRefine(({ courses }, context) => {
    const repeated = [
      ...repeatedSlugs(courseSlugs(courses)),
      ...courses.flatMap((course, courseIndex) => repeatedSlugs(lessonSlugs(course, courseIndex))),
    ]

    for (const { path, slug } of repeated) {
      context.addIssue({ code: "custom", input: slug, message: "slugDuplicate", path })
    }
  })

const coverImage = zod
  .file({ message: "fileRequired" })
  .min(MIN_FIELD_LENGTH, { message: "fileRequired" })
  .max(COURSE_COVER_MAX_BYTES, { message: "coverTooLarge" })

const courseCoverSource = zod.object({
  file: coverImage.mime(Object.values(COURSE_COVER_SOURCE_TYPES), { message: "coverTypeUnsupported" }),
})

const coverVariants = zod
  .array(zod.object({ image: coverImage, width: zod.literal(COURSE_COVER_WIDTHS) }))
  .transform((variants, context) => {
    const extensions = new Set(variants.map(({ image }) => coverExtension(image.type)))
    const [extension] = extensions
    if (extensions.size !== 1 || extension === undefined) {
      context.addIssue({ code: "custom", input: variants, message: "coverTypeUnsupported" })
      return zod.NEVER
    }

    return { contentType: COURSE_COVER_STORED_TYPES[extension], extension, variants }
  })

const uploadCourseCover = zod
  .instanceof(FormData)
  .transform((form) => coverEntries(form))
  .pipe(zod.object({ courseId: idField, variants: coverVariants }))
  .transform(({ courseId, variants }) => ({ courseId, ...variants }))

const removeCourseCover = courseIdInput

const deleteCourse = courseIdInput

const exportCourses = zod.object({
  courseId: idField.optional(),
})

const importCourses = zod.object({
  document: zod
    .string()
    .min(MIN_FIELD_LENGTH, { message: "documentRequired" })
    .max(COURSE_DOCUMENT_MAX_LENGTH, { message: "documentTooLarge" }),
  dryRun: zod.boolean(),
  removeMissing: zod.boolean(),
})

const getCatalogue = zod.object({
  locale: localeField,
})

const getCourse = zod.object({
  locale: localeField,
  slug: slugField,
})

const getCourseEditor = courseIdInput

const getCourseShowcase = zod.object({
  locale: localeField,
})

const getCourses = paginationSchema

const moveCourse = courseIdInput.extend({ direction: zod.enum(MOVE_DIRECTIONS) })

const updateCourse = courseFields.extend(courseIdInput.shape)

const searchCourses = localizedSearchSchema

export const courseZodSchemas = {
  courseCoverSource,
  courseDocument,
  createCourse,
  deleteCourse,
  exportCourses,
  getCatalogue,
  getCourse,
  getCourseEditor,
  getCourseShowcase,
  getCourses,
  importCourses,
  moveCourse,
  removeCourseCover,
  searchCourses,
  updateCourse,
  uploadCourseCover,
}
