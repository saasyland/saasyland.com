import { QueryClient, QueryClientProvider } from "@tanstack/react-query"
import { Outlet, RouterProvider, createMemoryHistory, createRootRouteWithContext, createRouter } from "@tanstack/react-router"
import { getRequest } from "@tanstack/react-start/server"
import { act, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { IntlProvider } from "use-intl"
import { vi } from "vite-plus/test"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { LOCALE_REWRITE } from "~/src/integrations/use-intl/i18n.utils"

import { COURSE_ACCESS_TEST_MESSAGES } from "~/src/modules/course/__test__/fixtures/course-access.messages"
import type { Course } from "~/src/modules/course/course.types"
import { catalogueQuery } from "~/src/modules/course/use-cases/get-catalogue"
import { courseQuery } from "~/src/modules/course/use-cases/get-course"
import { lessonQuery } from "~/src/modules/lesson/use-cases/get-lesson"
import { lessonPlaybackQuery } from "~/src/modules/lesson/use-cases/get-lesson-playback"

import { CATALOGUE, COURSE_SLUG, GUEST_PAGE, PLAYBACK, coursePages, lessonPageOf } from "~/src/routes/__test__/fixtures/course-pages"
import { Route as SiteRoute } from "~/src/routes/_site"
import { Route as MarketingRoute } from "~/src/routes/_site._marketing"
import { Route as CoursesRoute } from "~/src/routes/_site._marketing.courses"
import { Route as LessonRoute } from "~/src/routes/_site._marketing.courses.$course.$lesson"
import { Route as CourseRoute } from "~/src/routes/_site._marketing.courses.$course.index"
import { Route as CataloguePageRoute } from "~/src/routes/_site._marketing.courses.index"

import { DefaultNotFound } from "~/src/presentation/components/custom/default-not-found"

import messages from "~/messages/en-US/pages.courses.json"
import type { RouterContext } from "~/src/router"

interface CourseRouterOptions {
  readonly catalogue: Course["catalogue"]
  readonly data: Course["page"]
  readonly locale: SupportedLocale
  readonly path: string
}

const buildCourseRouter = ({ catalogue, data, locale, path }: CourseRouterOptions) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  queryClient.setQueryData(catalogueQuery({ locale }).queryKey, catalogue)
  queryClient.setQueryData(courseQuery({ locale, slug: COURSE_SLUG }).queryKey, data)
  coursePages.set("current", data)
  for (const { slug } of data.chapters.flatMap((chapter) => chapter.lessons)) {
    queryClient.setQueryData(lessonPlaybackQuery({ courseSlug: COURSE_SLUG, lessonSlug: slug }).queryKey, PLAYBACK)
    queryClient.setQueryData(lessonQuery({ courseSlug: COURSE_SLUG, lessonSlug: slug, locale }).queryKey, lessonPageOf(data, slug))
  }
  const root = createRootRouteWithContext<RouterContext>()({ component: Outlet })
  const metadata = { locale, metadata: messages.metadata }
  const lessonData = { locale, pathname: path, summary: "", title: "" }
  Object.assign(SiteRoute.options, { getParentRoute: () => root, id: "_site" })
  Object.assign(MarketingRoute.options, { getParentRoute: () => SiteRoute, id: "_marketing" })
  Object.assign(CoursesRoute.options, { getParentRoute: () => MarketingRoute, id: "/courses", path: "/courses" })
  Object.assign(CataloguePageRoute.options, { getParentRoute: () => CoursesRoute, id: "/", loader: () => metadata, path: "/" })
  Object.assign(CourseRoute.options, { getParentRoute: () => CoursesRoute, id: "/$course/", loader: () => lessonData, path: "/$course/" })
  Object.assign(LessonRoute.options, {
    getParentRoute: () => CoursesRoute,
    id: "/$course/$lesson",
    loader: () => lessonData,
    path: "/$course/$lesson",
  })
  const courses = CoursesRoute.addChildren([CataloguePageRoute, CourseRoute, LessonRoute])
  const site = SiteRoute.addChildren([MarketingRoute.addChildren([courses])])
  return createRouter({
    context: { queryClient },
    defaultNotFoundComponent: DefaultNotFound,
    defaultPendingMinMs: 0,
    history: createMemoryHistory({ initialEntries: [path] }),
    rewrite: LOCALE_REWRITE,
    routeTree: root.addChildren([site]),
  })
}

type CourseRouter = ReturnType<typeof buildCourseRouter>

const routers: CourseRouter[] = []

export const createCourseRouter = (options: CourseRouterOptions): CourseRouter => {
  const router = buildCourseRouter(options)
  routers.push(router)
  return router
}

export const mountCourseRouter = async (router: CourseRouter, locale: SupportedLocale = "en-US") => {
  const view = render(
    <QueryClientProvider client={router.options.context.queryClient}>
      <IntlProvider locale={locale} messages={{ ...getTestMessages(locale), ...COURSE_ACCESS_TEST_MESSAGES }} timeZone="UTC">
        <RouterProvider router={router} />
      </IntlProvider>
    </QueryClientProvider>,
  )
  await act(() => router.load())
  return view
}

export const renderCourses = async ({
  catalogue = CATALOGUE,
  data = GUEST_PAGE,
  locale = "en-US",
  path,
}: Partial<CourseRouterOptions> & Pick<CourseRouterOptions, "path">) => {
  vi.mocked(getRequest).mockReturnValue(new Request(`http://127.0.0.1:3000${path}`))
  const router = createCourseRouter({ catalogue, data, locale, path })
  await mountCourseRouter(router, locale)
  return router
}

export const clearCourseRouters = (): void => {
  for (const router of routers) {
    router.options.context.queryClient.clear()
  }
  routers.length = 0
}

export const stubCourseGlobals = (): void => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      observe = vi.fn()
      unobserve = vi.fn()
      disconnect = vi.fn()
    },
  )
  vi.stubGlobal("CSS", { escape: (value: string) => value, supports: () => true })
}

export const expand = async (name: RegExp): Promise<void> => {
  await userEvent.setup({ delay: null }).click(screen.getByRole("button", { name }))
}
