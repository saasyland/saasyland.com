import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Outlet, RouterProvider, createMemoryHistory, createRootRouteWithContext, createRouter } from "@tanstack/react-router"
import { getRequest } from "@tanstack/react-start/server"
import { act, cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { IntlProvider } from "use-intl"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import { LOCALE_REWRITE } from "~/src/integrations/use-intl/i18n.utils"

import { MOVE_DIRECTION } from "~/src/modules/_core/constants/ordering"
import { CHAPTER_MUTATION_KEYS } from "~/src/modules/chapter/chapter.constants"
import type { createChapterMutation } from "~/src/modules/chapter/use-cases/create-chapter"
import type { deleteChapterMutation } from "~/src/modules/chapter/use-cases/delete-chapter"
import type { moveChapterMutation } from "~/src/modules/chapter/use-cases/move-chapter"
import type { updateChapterMutation } from "~/src/modules/chapter/use-cases/update-chapter"
import { COURSE_KIND, COURSE_MUTATION_KEYS, COURSE_QUERY_KEYS, COURSE_STATUS } from "~/src/modules/course/course.constants"
import type { Course } from "~/src/modules/course/course.types"
import type { createCourseMutation } from "~/src/modules/course/use-cases/create-course"
import type { deleteCourseMutation } from "~/src/modules/course/use-cases/delete-course"
import { courseEditorQuery } from "~/src/modules/course/use-cases/get-course-editor"
import { getCoursesQuery } from "~/src/modules/course/use-cases/get-courses"
import type { moveCourseMutation } from "~/src/modules/course/use-cases/move-course"
import type { updateCourseMutation } from "~/src/modules/course/use-cases/update-course"
import { LESSON_ACCESS, LESSON_MUTATION_KEYS, LESSON_STATUS } from "~/src/modules/lesson/lesson.constants"
import type { createLessonMutation } from "~/src/modules/lesson/use-cases/create-lesson"
import type { deleteLessonMutation } from "~/src/modules/lesson/use-cases/delete-lesson"
import type { moveLessonMutation } from "~/src/modules/lesson/use-cases/move-lesson"
import type { updateLessonMutation } from "~/src/modules/lesson/use-cases/update-lesson"
import { getVideosPageQuery } from "~/src/modules/video/use-cases/get-videos"
import type { Video } from "~/src/modules/video/video.types"

import { Route as AdminCoursesRoute } from "~/src/routes/admin.courses"
import { Route as CourseEditorRoute } from "~/src/routes/admin.courses.$courseId"
import { Route as CourseCreateRoute } from "~/src/routes/admin.courses.create"
import { Route as CourseListRoute } from "~/src/routes/admin.courses.index"

import validations from "~/messages/en-US/course.validations.json"
import errors from "~/messages/en-US/errors.json"
import labels from "~/messages/en-US/pages.admin.courses.json"
import type { RouterContext } from "~/src/router"

const mutations = vi.hoisted(() => ({
  createChapter: vi.fn<NonNullable<typeof createChapterMutation.mutationFn>>(),
  createCourse: vi.fn<NonNullable<typeof createCourseMutation.mutationFn>>(),
  createLesson: vi.fn<NonNullable<typeof createLessonMutation.mutationFn>>(),
  deleteChapter: vi.fn<NonNullable<typeof deleteChapterMutation.mutationFn>>(),
  deleteCourse: vi.fn<NonNullable<typeof deleteCourseMutation.mutationFn>>(),
  deleteLesson: vi.fn<NonNullable<typeof deleteLessonMutation.mutationFn>>(),
  moveChapter: vi.fn<NonNullable<typeof moveChapterMutation.mutationFn>>(),
  moveCourse: vi.fn<NonNullable<typeof moveCourseMutation.mutationFn>>(),
  moveLesson: vi.fn<NonNullable<typeof moveLessonMutation.mutationFn>>(),
  updateChapter: vi.fn<NonNullable<typeof updateChapterMutation.mutationFn>>(),
  updateCourse: vi.fn<NonNullable<typeof updateCourseMutation.mutationFn>>(),
  updateLesson: vi.fn<NonNullable<typeof updateLessonMutation.mutationFn>>(),
}))

vi.mock(import("~/src/modules/course/use-cases/create-course"), () => ({
  createCourseMutation: { mutationFn: mutations.createCourse, mutationKey: COURSE_MUTATION_KEYS.CREATE },
}))
vi.mock(import("~/src/modules/course/use-cases/update-course"), () => ({
  updateCourseMutation: { mutationFn: mutations.updateCourse, mutationKey: COURSE_MUTATION_KEYS.UPDATE },
}))
vi.mock(import("~/src/modules/course/use-cases/delete-course"), () => ({
  deleteCourseMutation: { mutationFn: mutations.deleteCourse, mutationKey: COURSE_MUTATION_KEYS.DELETE },
}))
vi.mock(import("~/src/modules/course/use-cases/move-course"), () => ({
  moveCourseMutation: { mutationFn: mutations.moveCourse, mutationKey: COURSE_MUTATION_KEYS.MOVE },
}))
vi.mock(import("~/src/modules/chapter/use-cases/create-chapter"), () => ({
  createChapterMutation: { mutationFn: mutations.createChapter, mutationKey: CHAPTER_MUTATION_KEYS.CREATE },
}))
vi.mock(import("~/src/modules/chapter/use-cases/update-chapter"), () => ({
  updateChapterMutation: { mutationFn: mutations.updateChapter, mutationKey: CHAPTER_MUTATION_KEYS.UPDATE },
}))
vi.mock(import("~/src/modules/chapter/use-cases/delete-chapter"), () => ({
  deleteChapterMutation: { mutationFn: mutations.deleteChapter, mutationKey: CHAPTER_MUTATION_KEYS.DELETE },
}))
vi.mock(import("~/src/modules/chapter/use-cases/move-chapter"), () => ({
  moveChapterMutation: { mutationFn: mutations.moveChapter, mutationKey: CHAPTER_MUTATION_KEYS.MOVE },
}))
vi.mock(import("~/src/modules/lesson/use-cases/create-lesson"), () => ({
  createLessonMutation: { mutationFn: mutations.createLesson, mutationKey: LESSON_MUTATION_KEYS.CREATE },
}))
vi.mock(import("~/src/modules/lesson/use-cases/update-lesson"), () => ({
  updateLessonMutation: { mutationFn: mutations.updateLesson, mutationKey: LESSON_MUTATION_KEYS.UPDATE },
}))
vi.mock(import("~/src/modules/lesson/use-cases/delete-lesson"), () => ({
  deleteLessonMutation: { mutationFn: mutations.deleteLesson, mutationKey: LESSON_MUTATION_KEYS.DELETE },
}))
vi.mock(import("~/src/modules/lesson/use-cases/move-lesson"), () => ({
  moveLessonMutation: { mutationFn: mutations.moveLesson, mutationKey: LESSON_MUTATION_KEYS.MOVE },
}))

const UPDATED_AT = new Date("2026-11-01T12:00:00Z")
const COURSE_ID = "01960000-0000-7000-8000-00000000c001"
const CREATED_ID = "01960000-0000-7000-8000-00000000c009"
const VIDEO_LIBRARY_PAGE_SIZE = 100

const VIDEO: Video["select"] = {
  captionLocales: [],
  createdAt: UPDATED_AT,
  durationMs: 125_000,
  height: 1080,
  id: "01960000-0000-7000-8000-00000000f001",
  sizeBytes: 1,
  title: "Boundaries take",
  updatedAt: UPDATED_AT,
  width: 1920,
}

const COURSE: Course["select"] = {
  createdAt: UPDATED_AT,
  id: COURSE_ID,
  kind: COURSE_KIND.COURSE,
  position: 1,
  slug: "the-walkthrough",
  status: COURSE_STATUS.PUBLISHED,
  summary: { "en-US": "How it works." },
  title: { "en-US": "The walkthrough" },
  updatedAt: UPDATED_AT,
}

const editorLesson = (
  slug: string,
  title: string,
  overrides: Partial<Course["editor"]["chapters"][number]["lessons"][number]> = {},
): Course["editor"]["chapters"][number]["lessons"][number] => ({
  access: LESSON_ACCESS.PAID,
  chapterId: "chapter-one",
  id: `lesson-${slug}`,
  position: 1,
  slug,
  status: LESSON_STATUS.PUBLISHED,
  summary: { "en-US": `${title} summary.` },
  title: { "en-US": title },
  video: null,
  ...overrides,
})

const EDITOR: Course["editor"] = {
  chapters: [
    {
      id: "chapter-one",
      lessons: [
        editorLesson("boundaries", "Boundaries", {
          access: LESSON_ACCESS.PREVIEW,
          video: { durationMs: VIDEO.durationMs, id: VIDEO.id, title: VIDEO.title },
        }),
        editorLesson("sessions", "Sessions", { position: 2, status: LESSON_STATUS.DRAFT }),
      ],
      position: 1,
      title: { "en-US": "Foundations" },
    },
    { id: "chapter-two", lessons: [], position: 2, title: { "en-US": "Product" } },
  ],
  course: COURSE,
}

const LIST: Awaited<ReturnType<NonNullable<typeof getCoursesQuery.queryFn>>> = {
  rows: [
    {
      id: COURSE_ID,
      kind: COURSE_KIND.COURSE,
      lessons: 2,
      slug: COURSE.slug,
      status: COURSE_STATUS.PUBLISHED,
      title: COURSE.title,
      updatedAt: UPDATED_AT,
    },
    {
      id: "01960000-0000-7000-8000-00000000c002",
      kind: COURSE_KIND.TUTORIAL,
      lessons: 0,
      slug: "one-off",
      status: COURSE_STATUS.DRAFT,
      title: { "en-US": "One-off tutorial" },
      updatedAt: UPDATED_AT,
    },
  ],
  total: 2,
}

const createAdminCourseRouter = (path: string, editor: Course["editor"]) => {
  const queryClient = new QueryClient({ defaultOptions: { mutations: { retry: false }, queries: { retry: false, staleTime: Infinity } } })
  queryClient.setQueryData(getCoursesQuery.queryKey, LIST)
  queryClient.setQueryData(courseEditorQuery({ courseId: editor.course.id }).queryKey, editor)
  queryClient.setQueryData(courseEditorQuery({ courseId: CREATED_ID }).queryKey, { ...EDITOR, course: { ...COURSE, id: CREATED_ID } })
  queryClient.setQueryData(getVideosPageQuery({ pageSize: VIDEO_LIBRARY_PAGE_SIZE }).queryKey, { rows: [VIDEO], total: 1 })

  const root = createRootRouteWithContext<RouterContext>()({ component: Outlet })
  const metadata = { locale: "en-US", metadata: labels.metadata }
  Object.assign(AdminCoursesRoute.options, {
    getParentRoute: () => root,
    id: "/admin/courses",
    loader: () => metadata,
    path: "/admin/courses",
  })
  Object.assign(CourseListRoute.options, { getParentRoute: () => AdminCoursesRoute, id: "/", loader: () => metadata, path: "/" })
  Object.assign(CourseCreateRoute.options, {
    getParentRoute: () => AdminCoursesRoute,
    id: "/create",
    loader: () => metadata,
    path: "/create",
  })
  Object.assign(CourseEditorRoute.options, {
    getParentRoute: () => AdminCoursesRoute,
    id: "/$courseId",
    loader: () => ({ locale: "en-US", pathname: path, title: "" }),
    path: "/$courseId",
  })
  return createRouter({
    context: { queryClient },
    defaultPendingMinMs: 0,
    history: createMemoryHistory({ initialEntries: [path] }),
    rewrite: LOCALE_REWRITE,
    routeTree: root.addChildren([AdminCoursesRoute.addChildren([CourseListRoute, CourseCreateRoute, CourseEditorRoute])]),
  })
}

const routers: ReturnType<typeof createAdminCourseRouter>[] = []

const renderAdminCourses = async (path: string, editor: Course["editor"] = EDITOR) => {
  vi.mocked(getRequest).mockReturnValue(new Request(`http://127.0.0.1:3000${path}`))
  const router = createAdminCourseRouter(path, editor)
  const { queryClient } = router.options.context
  const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue()
  routers.push(router)
  render(
    <QueryClientProvider client={queryClient}>
      <IntlProvider locale="en-US" messages={getTestMessages("en-US")} timeZone="UTC">
        <RouterProvider router={router} />
      </IntlProvider>
    </QueryClientProvider>,
  )
  await act(() => router.load())
  return { invalidateQueries, router, user: userEvent.setup() }
}

const chapterSection = (title: string): HTMLElement => {
  const section = screen.getByRole("heading", { level: 3, name: title }).closest("li")
  if (!section) {
    throw new Error(`Missing chapter ${title}`)
  }
  return section
}

const lessonRow = (title: string): HTMLElement => {
  const row = screen.getByText(title, { selector: "p" }).closest("li")
  if (!row) {
    throw new Error(`Missing lesson ${title}`)
  }
  return row
}

const chooseOption = async (user: ReturnType<typeof userEvent.setup>, label: string, option: string): Promise<void> => {
  await user.click(screen.getByRole("button", { name: new RegExp(label, "u") }))
  await user.click(await screen.findByRole("option", { name: option }))
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.spyOn(toast, "success").mockReturnValue(0)
  vi.spyOn(toast, "error").mockReturnValue(0)
  mutations.createCourse.mockResolvedValue({ id: CREATED_ID })
  mutations.updateCourse.mockResolvedValue({ id: COURSE_ID })
  mutations.deleteCourse.mockResolvedValue({ id: COURSE_ID })
  mutations.createChapter.mockResolvedValue({ id: "chapter-three" })
  mutations.updateChapter.mockResolvedValue({ id: "chapter-one" })
  mutations.deleteChapter.mockResolvedValue({ id: "chapter-one" })
  mutations.moveChapter.mockResolvedValue({ chapterId: "chapter-one" })
  mutations.moveCourse.mockResolvedValue({ courseId: COURSE_ID })
  mutations.createLesson.mockResolvedValue({ id: "lesson-new" })
  mutations.updateLesson.mockResolvedValue({ id: "lesson-sessions" })
  mutations.deleteLesson.mockResolvedValue({ id: "lesson-sessions" })
  mutations.moveLesson.mockResolvedValue({ lessonId: "lesson-boundaries" })
})

afterEach(() => {
  cleanup()
  for (const router of routers) {
    router.options.context.queryClient.clear()
  }
  routers.length = 0
  vi.restoreAllMocks()
})

describe("admin course list", () => {
  it("lists every course with its type, status and lesson count", async () => {
    await renderAdminCourses("/admin/courses")

    expect(screen.getByRole("heading", { level: 1, name: labels.title })).toBeVisible()
    const row = screen.getByText("The walkthrough").closest("tr")
    if (!row) {
      throw new Error("Missing course row")
    }
    expect(within(row).getByText("/courses/the-walkthrough")).toBeVisible()
    expect(within(row).getByText(labels.form.kinds.course)).toBeVisible()
    expect(within(row).getByText(labels.form.statuses.published)).toBeVisible()
    expect(within(row).getByText("2")).toBeVisible()
    expect(within(row).getByRole("link", { name: "Edit The walkthrough" })).toHaveAttribute("href", `/admin/courses/${COURSE_ID}`)
    expect(screen.getByRole("link", { name: labels.actions.create })).toHaveAttribute("href", "/admin/courses/create")
  })

  it("deletes a course after confirmation and refreshes the list", async () => {
    const { invalidateQueries, user } = await renderAdminCourses("/admin/courses")

    await user.click(screen.getByRole("button", { name: "Delete The walkthrough" }))
    const confirm = await screen.findByRole("alertdialog")
    await user.click(within(confirm).getByRole("button", { name: labels.delete.confirm }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith("“The walkthrough” was deleted")
    })
    expect(mutations.deleteCourse).toHaveBeenCalledWith({ courseId: COURSE_ID }, expect.anything())
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: COURSE_QUERY_KEYS.ALL })
  })

  it("reorders the catalogue", async () => {
    const { invalidateQueries, user } = await renderAdminCourses("/admin/courses")

    expect(screen.getByRole("button", { name: "Move The walkthrough up" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Move One-off tutorial down" })).toBeDisabled()
    await user.click(screen.getByRole("button", { name: "Move The walkthrough down" }))

    await waitFor(() => {
      expect(mutations.moveCourse).toHaveBeenCalledWith({ courseId: COURSE_ID, direction: MOVE_DIRECTION.DOWN }, expect.anything())
    })
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: COURSE_QUERY_KEYS.ALL })
  })

  it("explains a failed deletion", async () => {
    mutations.deleteCourse.mockRejectedValueOnce(new Error("NOT_FOUND"))
    const { user } = await renderAdminCourses("/admin/courses")

    await user.click(screen.getByRole("button", { name: "Delete The walkthrough" }))
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: labels.delete.confirm }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errors.codes.NOT_FOUND)
    })
  })
})

describe("admin course creation", () => {
  it("explains what is missing before creating anything", async () => {
    const { user } = await renderAdminCourses("/admin/courses/create")

    await user.click(screen.getByRole("button", { name: labels.form.create }))

    expect(await screen.findAllByText(validations.defaultLocaleRequired)).toHaveLength(2)
    expect(screen.getByText(validations.slugInvalid)).toBeVisible()
    expect(mutations.createCourse).not.toHaveBeenCalled()
  })

  it("creates the course and opens its editor", async () => {
    const { router, user } = await renderAdminCourses("/admin/courses/create")

    await user.type(screen.getByLabelText(labels.form.courseTitle), "Build a SaaS")
    await user.type(screen.getByLabelText(labels.form.summary), "From zero.")
    await user.click(within(screen.getByRole("tablist", { name: labels.form.titleLanguages })).getByRole("tab", { name: "pl-PL" }))
    await user.type(screen.getByLabelText(labels.form.courseTitle), "Zbuduj SaaS")
    await user.click(within(screen.getByRole("tablist", { name: labels.form.summaryLanguages })).getByRole("tab", { name: "pl-PL" }))
    expect(screen.getByLabelText(labels.form.summary)).toHaveValue("")
    await user.type(screen.getByLabelText(labels.form.slug), "build-a-saas")
    await chooseOption(user, labels.form.kind, labels.form.kinds.project)
    await user.click(screen.getByRole("button", { name: labels.form.create }))

    await waitFor(() => {
      expect(router.state.location.pathname).toBe(`/admin/courses/${CREATED_ID}`)
    })
    expect(mutations.createCourse).toHaveBeenCalledWith(
      {
        kind: COURSE_KIND.PROJECT,
        slug: "build-a-saas",
        status: COURSE_STATUS.DRAFT,
        summary: { "en-US": "From zero." },
        title: { "en-US": "Build a SaaS", "pl-PL": "Zbuduj SaaS" },
      },
      expect.anything(),
    )
    expect(toast.success).toHaveBeenCalledWith(labels.form.created)
  })

  it("ignores an empty selection from the native select", async () => {
    const { user } = await renderAdminCourses("/admin/courses/create")

    fireEvent.change(within(screen.getByText(labels.form.kind).closest("div") ?? document.body).getByRole("combobox", { hidden: true }), {
      target: { value: "" },
    })
    await user.type(screen.getByLabelText(labels.form.courseTitle), "Build a SaaS")
    await user.type(screen.getByLabelText(labels.form.summary), "From zero.")
    await user.type(screen.getByLabelText(labels.form.slug), "build-a-saas")
    await user.click(screen.getByRole("button", { name: labels.form.create }))

    await waitFor(() => {
      expect(mutations.createCourse).toHaveBeenCalledWith(expect.objectContaining({ kind: COURSE_KIND.COURSE }), expect.anything())
    })
  })

  it("explains a slug that is already taken", async () => {
    mutations.createCourse.mockRejectedValueOnce(new Error("CONFLICT"))
    const { user } = await renderAdminCourses("/admin/courses/create")

    await user.type(screen.getByLabelText(labels.form.courseTitle), "Again")
    await user.type(screen.getByLabelText(labels.form.summary), "Twice.")
    await user.type(screen.getByLabelText(labels.form.slug), "the-walkthrough")
    await user.click(screen.getByRole("button", { name: labels.form.create }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errors.codes.CONFLICT)
    })
  })
})

describe("admin course editor", () => {
  it("shows the course details and its curriculum", async () => {
    await renderAdminCourses(`/admin/courses/${COURSE_ID}`)

    expect(screen.getByRole("heading", { level: 1, name: "The walkthrough" })).toBeVisible()
    expect(screen.getByRole("link", { name: labels.editor.view })).toHaveAttribute("href", "/courses/the-walkthrough")
    expect(screen.getByLabelText(labels.form.courseTitle)).toHaveValue("The walkthrough")
    expect(screen.getByLabelText(labels.form.slug)).toHaveValue("the-walkthrough")

    const boundaries = lessonRow("Boundaries")
    expect(within(boundaries).getByText("Boundaries take · 2:05")).toBeVisible()
    expect(within(boundaries).getByText(labels.lesson.accessLevels.preview)).toBeVisible()
    const sessions = lessonRow("Sessions")
    expect(within(sessions).getByText(labels.curriculum.noVideo)).toBeVisible()
    expect(within(sessions).getByText(labels.lesson.statuses.draft)).toBeVisible()
    expect(within(chapterSection("Product")).getByText(labels.curriculum.noLessons)).toBeVisible()
  })

  it("saves the course details", async () => {
    const { invalidateQueries, user } = await renderAdminCourses(`/admin/courses/${COURSE_ID}`)

    await chooseOption(user, labels.form.status, labels.form.statuses.draft)
    await user.click(screen.getByRole("button", { name: labels.form.save }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(labels.form.saved)
    })
    expect(mutations.updateCourse).toHaveBeenCalledWith(
      {
        courseId: COURSE_ID,
        kind: COURSE.kind,
        slug: COURSE.slug,
        status: COURSE_STATUS.DRAFT,
        summary: COURSE.summary,
        title: COURSE.title,
      },
      expect.anything(),
    )
    expect(invalidateQueries).toHaveBeenCalledWith({ queryKey: COURSE_QUERY_KEYS.ALL })
  })

  it("links to the public page only once the course is published", async () => {
    await renderAdminCourses(`/admin/courses/${COURSE_ID}`, { ...EDITOR, course: { ...COURSE, status: COURSE_STATUS.DRAFT } })

    expect(screen.getByRole("heading", { level: 1, name: "The walkthrough" })).toBeVisible()
    expect(screen.queryByRole("link", { name: labels.editor.view })).toBeNull()
  })

  it("explains a failed save", async () => {
    mutations.updateCourse.mockRejectedValueOnce(new Error("CONFLICT"))
    const { user } = await renderAdminCourses(`/admin/courses/${COURSE_ID}`)

    await user.click(screen.getByRole("button", { name: labels.form.save }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errors.codes.CONFLICT)
    })
  })
})

describe("admin course chapters", () => {
  it("invites the first chapter of an empty course", async () => {
    await renderAdminCourses(`/admin/courses/${COURSE_ID}`, { chapters: [], course: COURSE })

    expect(screen.getByText(labels.curriculum.empty)).toBeVisible()
  })

  it("adds and renames chapters", async () => {
    const { user } = await renderAdminCourses(`/admin/courses/${COURSE_ID}`)

    await user.click(screen.getByRole("button", { name: labels.curriculum.addChapter }))
    const dialog = await screen.findByRole("dialog")
    await user.type(within(dialog).getByLabelText(labels.chapter.title), "Launch")
    await user.click(within(dialog).getByRole("button", { name: labels.chapter.save }))

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull()
    })
    expect(mutations.createChapter).toHaveBeenCalledWith({ courseId: COURSE_ID, title: { "en-US": "Launch" } }, expect.anything())
    expect(toast.success).toHaveBeenCalledWith(labels.chapter.saved)

    await user.click(within(chapterSection("Product")).getByRole("button", { name: "Edit Product" }))
    const rename = await screen.findByRole("dialog")
    expect(within(rename).getByRole("heading", { name: labels.chapter.edit })).toBeVisible()
    await user.clear(within(rename).getByLabelText(labels.chapter.title))
    await user.type(within(rename).getByLabelText(labels.chapter.title), "Shipping")
    await user.click(within(rename).getByRole("button", { name: labels.chapter.save }))

    await waitFor(() => {
      expect(mutations.updateChapter).toHaveBeenCalledWith({ chapterId: "chapter-two", title: { "en-US": "Shipping" } }, expect.anything())
    })
  })

  it("moves and deletes chapters", async () => {
    const { user } = await renderAdminCourses(`/admin/courses/${COURSE_ID}`)

    expect(screen.getByRole("button", { name: "Move Foundations up" })).toBeDisabled()
    expect(screen.getByRole("button", { name: "Move Product down" })).toBeDisabled()
    await user.click(screen.getByRole("button", { name: "Move Product up" }))
    await waitFor(() => {
      expect(mutations.moveChapter).toHaveBeenCalledWith({ chapterId: "chapter-two", direction: MOVE_DIRECTION.UP }, expect.anything())
    })

    await user.click(screen.getByRole("button", { name: "Delete Foundations" }))
    const confirm = await screen.findByRole("alertdialog")
    expect(within(confirm).getByText(labels.curriculum.deleteChapterTitle)).toBeVisible()
    await user.click(within(confirm).getByRole("button", { name: labels.curriculum.delete }))
    await waitFor(() => {
      expect(mutations.deleteChapter).toHaveBeenCalledWith({ chapterId: "chapter-one" }, expect.anything())
    })
  })

  it("explains a failed chapter save and keeps the dialog open", async () => {
    mutations.updateChapter.mockRejectedValueOnce(new Error("NOT_FOUND"))
    const { user } = await renderAdminCourses(`/admin/courses/${COURSE_ID}`)

    await user.click(within(chapterSection("Product")).getByRole("button", { name: "Edit Product" }))
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: labels.chapter.save }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errors.codes.NOT_FOUND)
    })
    expect(screen.getByRole("dialog")).toBeVisible()
  })
})

describe("admin course lessons", () => {
  it("offers only lessons without a video while the library loads", async () => {
    const { router, user } = await renderAdminCourses(`/admin/courses/${COURSE_ID}`)
    const { queryClient } = router.options.context
    const library = getVideosPageQuery({ pageSize: VIDEO_LIBRARY_PAGE_SIZE }).queryKey
    const { promise } = Promise.withResolvers<never>()
    queryClient.removeQueries({ queryKey: library })
    queryClient.setQueryDefaults(library, { queryFn: () => promise })

    await user.click(within(chapterSection("Product")).getByRole("button", { name: labels.curriculum.addLesson }))
    await user.click(screen.getByRole("button", { name: new RegExp(labels.lesson.video, "u") }))

    expect(await screen.findAllByRole("option")).toHaveLength(1)
    expect(screen.getByRole("option", { name: labels.lesson.noVideo })).toBeVisible()
  })

  it("adds a lesson that plays a video from the library", async () => {
    const { user } = await renderAdminCourses(`/admin/courses/${COURSE_ID}`)

    await user.click(within(chapterSection("Product")).getByRole("button", { name: labels.curriculum.addLesson }))
    const dialog = await screen.findByRole("dialog")
    await user.type(within(dialog).getByLabelText(labels.lesson.title), "Checkout")
    await user.type(within(dialog).getByLabelText(labels.lesson.summary), "Paying.")
    await user.type(within(dialog).getByLabelText(labels.lesson.slug), "checkout")
    await chooseOption(user, labels.lesson.access, labels.lesson.accessLevels.account)
    await chooseOption(user, labels.lesson.video, "Boundaries take · 2:05")
    await user.click(within(dialog).getByRole("button", { name: labels.lesson.save }))

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(labels.lesson.saved)
    })
    expect(mutations.createLesson).toHaveBeenCalledWith(
      {
        access: LESSON_ACCESS.ACCOUNT,
        chapterId: "chapter-two",
        slug: "checkout",
        status: LESSON_STATUS.DRAFT,
        summary: { "en-US": "Paying." },
        title: { "en-US": "Checkout" },
        videoId: VIDEO.id,
      },
      expect.anything(),
    )
  })

  it("edits a lesson and detaches its video", async () => {
    const { user } = await renderAdminCourses(`/admin/courses/${COURSE_ID}`)

    await user.click(within(lessonRow("Boundaries")).getByRole("button", { name: "Edit Boundaries" }))
    const dialog = await screen.findByRole("dialog")
    expect(within(dialog).getByLabelText(labels.lesson.slug)).toHaveValue("boundaries")
    await chooseOption(user, labels.lesson.video, labels.lesson.noVideo)
    await user.click(within(dialog).getByRole("button", { name: labels.lesson.save }))

    await waitFor(() => {
      expect(mutations.updateLesson).toHaveBeenCalledWith(
        {
          access: LESSON_ACCESS.PREVIEW,
          lessonId: "lesson-boundaries",
          slug: "boundaries",
          status: LESSON_STATUS.PUBLISHED,
          summary: { "en-US": "Boundaries summary." },
          title: { "en-US": "Boundaries" },
        },
        expect.anything(),
      )
    })
  })

  it("explains a failed lesson save and keeps the dialog open", async () => {
    mutations.updateLesson.mockRejectedValueOnce(new Error("CONFLICT"))
    const { user } = await renderAdminCourses(`/admin/courses/${COURSE_ID}`)

    await user.click(within(lessonRow("Sessions")).getByRole("button", { name: "Edit Sessions" }))
    await user.click(within(await screen.findByRole("dialog")).getByRole("button", { name: labels.lesson.save }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errors.codes.CONFLICT)
    })
    expect(screen.getByRole("dialog")).toBeVisible()
  })

  it("moves and deletes lessons", async () => {
    const { user } = await renderAdminCourses(`/admin/courses/${COURSE_ID}`)

    expect(screen.getByRole("button", { name: "Move Boundaries up" })).toBeDisabled()
    await user.click(screen.getByRole("button", { name: "Move Boundaries down" }))
    await waitFor(() => {
      expect(mutations.moveLesson).toHaveBeenCalledWith(
        { direction: MOVE_DIRECTION.DOWN, lessonId: "lesson-boundaries" },
        expect.anything(),
      )
    })

    await user.click(screen.getByRole("button", { name: "Delete Sessions" }))
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: labels.curriculum.delete }))
    await waitFor(() => {
      expect(mutations.deleteLesson).toHaveBeenCalledWith({ lessonId: "lesson-sessions" }, expect.anything())
    })
  })

  it("explains a failed curriculum change", async () => {
    mutations.moveLesson.mockRejectedValueOnce(new Error("NOT_FOUND"))
    const { user } = await renderAdminCourses(`/admin/courses/${COURSE_ID}`)

    await user.click(screen.getByRole("button", { name: "Move Sessions up" }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errors.codes.NOT_FOUND)
    })
  })
})
