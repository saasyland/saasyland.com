import type { ComponentProps } from "react"

import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Outlet, RouterProvider, createMemoryHistory, createRootRouteWithContext, createRouter } from "@tanstack/react-router"
import { getRequest } from "@tanstack/react-start/server"
import { act, cleanup, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { IntlProvider } from "use-intl"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { LOCALE_REWRITE } from "~/src/integrations/use-intl/i18n.utils"

import { COURSE_KIND, COURSE_QUERY_KEYS } from "~/src/modules/course/course.constants"
import type { Course } from "~/src/modules/course/course.types"
import { catalogueQuery } from "~/src/modules/course/use-cases/get-catalogue"
import { courseQuery } from "~/src/modules/course/use-cases/get-course"
import { LESSON_PROGRESS_MUTATION_KEYS } from "~/src/modules/lesson-progress/lesson-progress.constants"
import type { saveLessonProgressMutation } from "~/src/modules/lesson-progress/use-cases/save-lesson-progress"
import { LESSON_ACCESS, LESSON_QUERY_KEYS } from "~/src/modules/lesson/lesson.constants"
import { lessonPlaybackQuery } from "~/src/modules/lesson/use-cases/get-lesson-playback"
import { LICENSE_TIER } from "~/src/modules/license/license.constants"
import type { Video } from "~/src/modules/video/video.types"

import { Route as CoursesRoute } from "~/src/routes/courses"
import { Route as LessonRoute } from "~/src/routes/courses.$course.$lesson"
import { Route as CourseRoute } from "~/src/routes/courses.$course.index"
import { Route as CataloguePageRoute } from "~/src/routes/courses.index"

import { CataloguePending, CoursePending, LessonPending } from "~/src/presentation/components/custom/courses/courses-pending"
import { DefaultNotFound } from "~/src/presentation/components/custom/default-not-found"
import type { VideoPlayer } from "~/src/presentation/components/custom/video-player"

import messages from "~/messages/en-US/pages.courses.json"
import plNavigationMessages from "~/messages/pl-PL/components.custom.navigation.json"
import type { RouterContext } from "~/src/router"

type PlayerProps = ComponentProps<typeof VideoPlayer>

const player = vi.hoisted(() => new Map<"props", PlayerProps>())
const coursePages = vi.hoisted(() => new Map<"current", Course["page"]>())
const save = vi.hoisted(() => vi.fn<NonNullable<typeof saveLessonProgressMutation.mutationFn>>())

vi.mock(import("~/src/presentation/components/custom/video-player"), () => ({
  VideoPlayer: (props: PlayerProps) => {
    player.set("props", props)
    return <div data-start={props.startAt} data-testid="video-player" />
  },
}))

vi.mock(import("~/src/modules/course/use-cases/get-course"), async (importOriginal) => {
  const actual = await importOriginal()
  return {
    ...actual,
    courseQuery: (input: Course["getCourse"]) => ({
      ...actual.courseQuery(input),
      queryFn: () => {
        const page = coursePages.get("current")
        return page === undefined ? Promise.reject(new Error("No course page")) : Promise.resolve(page)
      },
    }),
  }
})

vi.mock(import("~/src/modules/lesson-progress/use-cases/save-lesson-progress"), () => ({
  saveLessonProgressMutation: { mutationFn: save, mutationKey: LESSON_PROGRESS_MUTATION_KEYS.SAVE },
}))

const COURSE_SLUG = "the-walkthrough"

const PLAYBACK: Video["playback"] = {
  captions: [],
  poster: "/media/a.b/v/poster.webp",
  posterSmall: "/media/a.b/v/poster-960.webp",
  src: "/media/a.b/v/master.m3u8",
  storyboard: "/media/a.b/v/storyboard.vtt",
}

const lesson = (slug: string, title: string, overrides: Partial<Course["pageLesson"]> = {}): Course["pageLesson"] => ({
  access: LESSON_ACCESS.PAID,
  chapterId: "chapter",
  completed: false,
  durationMs: 125_000,
  id: `lesson-${slug}`,
  locked: false,
  positionMs: 0,
  slug,
  summary: `${title} summary.`,
  title,
  ...overrides,
})

const page = ({
  lessons,
  viewer,
}: {
  readonly lessons: Course["pageLesson"][]
  readonly viewer: Course["page"]["viewer"]
}): Course["page"] => ({
  chapters: [
    { id: "chapter-one", lessons: lessons.slice(0, 2), title: "Foundations" },
    { id: "chapter-two", lessons: lessons.slice(2), title: "Product" },
  ],
  course: { id: "course", kind: COURSE_KIND.COURSE, slug: COURSE_SLUG, summary: "How it works.", title: "The walkthrough" },
  viewer,
})

const GUEST_PAGE = page({
  lessons: [
    lesson("boundaries", "Boundaries", { access: LESSON_ACCESS.PREVIEW }),
    lesson("sessions", "Sessions", { access: LESSON_ACCESS.ACCOUNT, locked: true }),
    lesson("billing", "Billing", { locked: true }),
    lesson("coverage", "Coverage", { durationMs: null, locked: true }),
  ],
  viewer: { licensed: false, signedIn: false },
})

const LEARNER_PAGE = page({
  lessons: [
    lesson("boundaries", "Boundaries", { access: LESSON_ACCESS.PREVIEW, completed: true }),
    lesson("sessions", "Sessions", { access: LESSON_ACCESS.ACCOUNT, positionMs: 42_500 }),
    lesson("billing", "Billing"),
    lesson("coverage", "Coverage", { durationMs: null }),
  ],
  viewer: { licensed: true, signedIn: true },
})

const CUSTOMER_PAGE = page({
  lessons: [
    lesson("boundaries", "Boundaries", { access: LESSON_ACCESS.PREVIEW }),
    lesson("sessions", "Sessions", { access: LESSON_ACCESS.ACCOUNT }),
    lesson("billing", "Billing", { locked: true }),
  ],
  viewer: { licensed: false, signedIn: true },
})

const completeLesson = (source: Course["page"], slug: string): Course["page"] => ({
  ...source,
  chapters: source.chapters.map((chapter) => ({
    ...chapter,
    lessons: chapter.lessons.map((entry) => ({ ...entry, completed: entry.completed || entry.slug === slug })),
  })),
})

const CATALOGUE: Course["catalogue"] = [
  {
    durationMs: 375_000,
    id: "course",
    kind: COURSE_KIND.COURSE,
    lessons: 4,
    paid: 2,
    previews: 1,
    slug: COURSE_SLUG,
    summary: "How it works.",
    title: "The walkthrough",
  },
  {
    durationMs: 0,
    id: "tutorial",
    kind: COURSE_KIND.TUTORIAL,
    lessons: 0,
    paid: 0,
    previews: 0,
    slug: "one-off",
    summary: "A short one.",
    title: "One-off tutorial",
  },
]

const routers: ReturnType<typeof createCourseRouter>[] = []

const createCourseRouter = ({
  catalogue,
  data,
  locale,
  path,
}: {
  catalogue: Course["catalogue"]
  data: Course["page"]
  locale: SupportedLocale
  path: string
}) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  queryClient.setQueryData(catalogueQuery({ locale }).queryKey, catalogue)
  queryClient.setQueryData(courseQuery({ locale, slug: COURSE_SLUG }).queryKey, data)
  coursePages.set("current", data)
  for (const { slug } of data.chapters.flatMap((chapter) => chapter.lessons)) {
    queryClient.setQueryData(lessonPlaybackQuery({ courseSlug: COURSE_SLUG, lessonSlug: slug }).queryKey, PLAYBACK)
  }
  const root = createRootRouteWithContext<RouterContext>()({ component: Outlet })
  const metadata = { locale, metadata: messages.metadata }
  const lessonData = { locale, pathname: path, summary: "", title: "" }
  Object.assign(CoursesRoute.options, { getParentRoute: () => root, id: "/courses", path: "/courses" })
  Object.assign(CataloguePageRoute.options, { getParentRoute: () => CoursesRoute, id: "/", loader: () => metadata, path: "/" })
  Object.assign(CourseRoute.options, { getParentRoute: () => CoursesRoute, id: "/$course/", loader: () => lessonData, path: "/$course/" })
  Object.assign(LessonRoute.options, {
    getParentRoute: () => CoursesRoute,
    id: "/$course/$lesson",
    loader: () => lessonData,
    path: "/$course/$lesson",
  })
  return createRouter({
    context: { queryClient },
    defaultNotFoundComponent: DefaultNotFound,
    defaultPendingMinMs: 0,
    history: createMemoryHistory({ initialEntries: [path] }),
    rewrite: LOCALE_REWRITE,
    routeTree: root.addChildren([CoursesRoute.addChildren([CataloguePageRoute, CourseRoute, LessonRoute])]),
  })
}

const renderCourses = async ({
  catalogue = CATALOGUE,
  data = GUEST_PAGE,
  locale = "en-US",
  path,
}: {
  catalogue?: Course["catalogue"]
  data?: Course["page"]
  locale?: SupportedLocale
  path: string
}) => {
  vi.mocked(getRequest).mockReturnValue(new Request(`http://127.0.0.1:3000${path}`))
  const router = createCourseRouter({ catalogue, data, locale, path })
  routers.push(router)
  render(
    <QueryClientProvider client={router.options.context.queryClient}>
      <IntlProvider locale={locale} messages={getTestMessages(locale)} timeZone="UTC">
        <RouterProvider router={router} />
      </IntlProvider>
    </QueryClientProvider>,
  )
  await act(() => router.load())
  return router
}

beforeEach(() => {
  vi.clearAllMocks()
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe = vi.fn()
      unobserve = vi.fn()
      disconnect = vi.fn()
    },
  )
  player.clear()
  coursePages.clear()
  save.mockImplementation(({ completed, lessonId }) => Promise.resolve({ completed, lessonId }))
})

afterEach(() => {
  cleanup()
  for (const router of routers) {
    router.options.context.queryClient.clear()
  }
  routers.length = 0
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})

describe("course catalogue", () => {
  it("lists courses with their size, length and free lessons", async () => {
    await renderCourses({ path: "/courses" })

    const card = screen.getByRole("link", { name: /The walkthrough/u })
    expect(card).toHaveAttribute("href", "/courses/the-walkthrough")
    expect(within(card).getByText("4 lessons")).toBeVisible()
    expect(within(card).getByText("6 min")).toBeVisible()
    expect(within(card).getByText("1 free lesson")).toBeVisible()
    expect(screen.getByRole("link", { name: /One-off tutorial/u })).toHaveTextContent(messages.kinds.tutorial)
  })

  it("says when nothing is published", async () => {
    await renderCourses({ catalogue: [], path: "/courses" })

    expect(screen.getByText(messages.catalogue.empty)).toBeVisible()
  })

  it("keeps the courses link current in the localized navigation", async () => {
    await renderCourses({ locale: "pl-PL", path: "/pl-PL/courses" })

    const nav = within(screen.getByRole("navigation", { name: plNavigationMessages.ariaLabel }))
    expect(nav.getByRole("link", { name: plNavigationMessages.items.courses })).toHaveAttribute("aria-current", "page")
    expect(nav.getByRole("link", { name: plNavigationMessages.items.blog })).toHaveAttribute("href", "/pl-PL/blog")
    expect(nav.getByRole("link", { name: plNavigationMessages.getStarted })).toHaveAttribute("href", "/pl-PL#pricing")
  })
})

describe("course page", () => {
  it("starts a visitor on the free lesson and offers Complete for the locked ones", async () => {
    await renderCourses({ path: "/courses/the-walkthrough" })

    expect(screen.getByRole("heading", { level: 1, name: "The walkthrough" })).toBeVisible()
    expect(screen.getByRole("link", { name: messages.course.start })).toHaveAttribute("href", "/courses/the-walkthrough/boundaries")
    expect(screen.getByRole("link", { name: messages.course.unlock.cta })).toHaveAttribute("href", "/#pricing")
    expect(screen.queryByText(/lessons completed/u)).toBeNull()

    const boundaries = screen.getByRole("link", { name: /Boundaries/u })
    expect(boundaries).toHaveTextContent("01")
    expect(boundaries).toHaveTextContent("2:05")
    expect(boundaries).toHaveTextContent(messages.access.preview)
    expect(screen.getByRole("link", { name: /Sessions/u })).toHaveTextContent(messages.access.account)
    expect(screen.getByRole("link", { name: /Coverage/u })).toHaveTextContent("04")
    expect(screen.getByRole("link", { name: /Coverage/u })).not.toHaveTextContent(":")
  })

  it("shows a learner's progress and continues where they stopped", async () => {
    await renderCourses({ data: LEARNER_PAGE, path: "/courses/the-walkthrough" })

    expect(screen.getByRole("progressbar", { name: "1 of 4 lessons completed" })).toHaveAttribute("aria-valuenow", "1")
    expect(document.querySelectorAll("[data-slot=progress-indicator]")).toHaveLength(1)
    expect(screen.getByRole("link", { name: "Continue with Sessions" })).toHaveAttribute("href", "/courses/the-walkthrough/sessions")
    expect(screen.getByRole("link", { name: /Boundaries/u })).toHaveTextContent(messages.lesson.completed)
    expect(screen.queryByRole("heading", { name: messages.course.unlock.title })).toBeNull()
  })

  it("sends a signed-in customer to their licence page to unlock lessons", async () => {
    await renderCourses({ data: CUSTOMER_PAGE, path: "/courses/the-walkthrough" })

    expect(screen.getByRole("link", { name: messages.course.unlock.cta })).toHaveAttribute(
      "href",
      `/app/license?tier=${LICENSE_TIER.COMPLETE}`,
    )
  })

  it("offers no start link when every lesson is locked", async () => {
    const locked = page({ lessons: [lesson("billing", "Billing", { locked: true })], viewer: { licensed: false, signedIn: false } })
    await renderCourses({ data: locked, path: "/courses/the-walkthrough" })

    expect(screen.queryByRole("link", { name: messages.course.start })).toBeNull()
  })
})

describe("lesson page", () => {
  it("plays a free lesson for a visitor without saving progress", async () => {
    await renderCourses({ path: "/courses/the-walkthrough/boundaries" })

    expect(await screen.findByTestId("video-player")).toHaveAttribute("data-start", "0")
    expect(player.get("props")?.playback).toStrictEqual(PLAYBACK)
    expect(screen.getByRole("heading", { level: 1, name: "Boundaries" })).toBeVisible()
    expect(screen.getByText(messages.access.preview, { selector: "p" })).toBeVisible()
    expect(screen.queryByRole("button", { name: messages.lesson.markComplete })).toBeNull()
    player.get("props")?.onProgress?.(30)
    player.get("props")?.onEnded?.()
    expect(save).not.toHaveBeenCalled()

    const neighbours = within(screen.getByRole("navigation", { name: messages.lesson.contents }))
    expect(neighbours.getByRole("link", { name: /Sessions/u })).toHaveAttribute("href", "/courses/the-walkthrough/sessions")
    expect(neighbours.queryByText(messages.lesson.previous)).toBeNull()
  })

  it("resumes a learner, saves the position at most every fifteen seconds and completes on the end", async () => {
    const router = await renderCourses({ data: LEARNER_PAGE, path: "/courses/the-walkthrough/sessions" })
    const invalidate = vi.spyOn(router.options.context.queryClient, "invalidateQueries")

    expect(await screen.findByTestId("video-player")).toHaveAttribute("data-start", "42.5")
    player.get("props")?.onProgress?.(50.4)
    player.get("props")?.onProgress?.(55)
    await waitFor(() => {
      expect(save).toHaveBeenCalledOnce()
    })
    expect(save.mock.calls[0]?.[0]).toStrictEqual({ completed: false, lessonId: "lesson-sessions", positionMs: 50_400 })
    expect(invalidate).not.toHaveBeenCalled()

    coursePages.set("current", completeLesson(LEARNER_PAGE, "sessions"))
    player.get("props")?.onEnded?.()
    await waitFor(() => {
      expect(invalidate).toHaveBeenCalledWith({ queryKey: COURSE_QUERY_KEYS.DETAIL })
    })
    expect(save.mock.calls[1]?.[0]).toStrictEqual({ completed: true, lessonId: "lesson-sessions", positionMs: 0 })
    expect(await screen.findByText(messages.lesson.completed, { selector: "p" })).toBeVisible()
  })

  it("marks a lesson without a recording complete from the button", async () => {
    const user = userEvent.setup({ delay: null })
    await renderCourses({ data: LEARNER_PAGE, path: "/courses/the-walkthrough/coverage" })

    expect(screen.getByText(messages.lesson.noVideo)).toBeVisible()
    await user.click(screen.getByRole("button", { name: messages.lesson.markComplete }))

    await waitFor(() => {
      expect(save).toHaveBeenCalledWith({ completed: true, lessonId: "lesson-coverage", positionMs: 0 }, expect.anything())
    })
    const neighbours = within(screen.getByRole("navigation", { name: messages.lesson.contents }))
    expect(neighbours.getByRole("link", { name: /Billing/u })).toHaveTextContent(messages.lesson.previous)
  })

  it("says a lesson is already completed", async () => {
    await renderCourses({ data: LEARNER_PAGE, path: "/courses/the-walkthrough/boundaries" })

    expect(screen.getByText(messages.lesson.completed, { selector: "p" })).toBeVisible()
    expect(screen.queryByRole("button", { name: messages.lesson.markComplete })).toBeNull()
  })

  it.each([
    {
      cta: messages.lesson.locked.account.cta,
      data: GUEST_PAGE,
      href: "/auth/sign-in?redirect=%2Fcourses%2Fthe-walkthrough%2Fsessions",
      path: "sessions",
    },
    { cta: messages.lesson.locked.paid.cta, data: GUEST_PAGE, href: "/#pricing", path: "billing" },
    { cta: messages.lesson.locked.paid.cta, data: CUSTOMER_PAGE, href: `/app/license?tier=${LICENSE_TIER.COMPLETE}`, path: "billing" },
  ])("locks $path and links to $href", async ({ cta, data, href, path }) => {
    await renderCourses({ data, path: `/courses/the-walkthrough/${path}` })

    expect(screen.queryByTestId("video-player")).toBeNull()
    expect(screen.queryByRole("button", { name: messages.lesson.markComplete })).toBeNull()
    expect(screen.getByRole("link", { name: cta })).toHaveAttribute("href", href)
  })

  it("holds the player's place while the signed stream loads", async () => {
    const router = createCourseRouter({
      catalogue: CATALOGUE,
      data: GUEST_PAGE,
      locale: "en-US",
      path: "/courses/the-walkthrough/boundaries",
    })
    const { queryClient } = router.options.context
    queryClient.removeQueries({ queryKey: LESSON_QUERY_KEYS.PLAYBACK })
    queryClient.setQueryDefaults(LESSON_QUERY_KEYS.PLAYBACK, { queryFn: () => new Promise<never>(() => {}) })
    routers.push(router)
    const { container } = render(
      <QueryClientProvider client={queryClient}>
        <IntlProvider locale="en-US" messages={getTestMessages("en-US")} timeZone="UTC">
          <RouterProvider router={router} />
        </IntlProvider>
      </QueryClientProvider>,
    )
    await act(() => router.load())

    expect(screen.queryByTestId("video-player")).toBeNull()
    expect(container.querySelector(".aspect-video[data-slot='skeleton']")).not.toBeNull()
  })

  it("shows the not-found page for an unknown lesson", async () => {
    await renderCourses({ path: "/courses/the-walkthrough/missing" })

    expect(screen.queryByTestId("video-player")).toBeNull()
    expect(screen.queryByRole("heading", { level: 1, name: "Boundaries" })).toBeNull()
  })
})

describe("course skeletons", () => {
  it.each([
    ["catalogue", CataloguePending],
    ["course", CoursePending],
    ["lesson", LessonPending],
  ])("marks the %s skeleton as busy", (_, Pending) => {
    const { container } = render(<Pending />)

    expect(container.querySelector('[aria-busy="true"]')).not.toBeNull()
  })
})
