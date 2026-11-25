import type * as RouterModule from "@tanstack/react-router"
import { screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { toast } from "sonner"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"
import { busyMarkup, markupOf } from "~/src/platform/testing/lib/skeleton"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"
import { MAX_PAGE_SIZE } from "~/src/modules/_core/utils/pagination"
import { NEWSLETTER_ISSUE_MUTATION_KEYS, NEWSLETTER_ISSUE_STATUS } from "~/src/modules/newsletter-issue/newsletter-issue.constants"
import type { NewsletterIssue } from "~/src/modules/newsletter-issue/newsletter-issue.types"
import type { createNewsletterIssueMutation } from "~/src/modules/newsletter-issue/use-cases/create-newsletter-issue"
import { getNewsletterIssuesPageQuery, getNewsletterIssuesQuery } from "~/src/modules/newsletter-issue/use-cases/get-newsletter-issues"
import type { sendNewsletterIssueMutation } from "~/src/modules/newsletter-issue/use-cases/send-newsletter-issue"
import { NEWSLETTER_SOURCE, NEWSLETTER_STATUS } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.constants"
import type { NewsletterSubscriber } from "~/src/modules/newsletter-subscriber/newsletter-subscriber.types"
import { newsletterSubscribersQuery } from "~/src/modules/newsletter-subscriber/use-cases/get-newsletter-subscribers"
import {
  listNewsletterSubscribersPageQuery,
  listNewsletterSubscribersQuery,
} from "~/src/modules/newsletter-subscriber/use-cases/list-newsletter-subscribers"

import { Route as NewsletterLayoutRoute } from "~/src/routes/admin.newsletter"
import { Route as SubscribersRoute } from "~/src/routes/admin.newsletter.index"
import { Route as IssuesRoute } from "~/src/routes/admin.newsletter.issues"
import { Route as ComposeRoute } from "~/src/routes/admin.newsletter_.compose"

import * as download from "~/src/lib/download"

import { fixtureDate } from "~/src/presentation/components/custom/admin/__test__/fixture-date"
import { adminQueryClient, renderAdminPage } from "~/src/presentation/components/custom/admin/__test__/fixtures"
import { newsletterIssueRow, newsletterSubscriberRow } from "~/src/presentation/components/custom/admin/__test__/newsletter.fixtures"
import { AdminPending } from "~/src/presentation/components/custom/admin/admin-pending"
import {
  AdminNewsletterComposePending,
  AdminNewsletterIssuesPending,
  AdminNewsletterPending,
  AdminNewsletterSubscribersPending,
} from "~/src/presentation/components/custom/admin/newsletter-pending"

import gridMessages from "~/messages/en-US/components.custom.data-grid.json"
import errors from "~/messages/en-US/errors.json"
import locales from "~/messages/en-US/locales.json"
import navigationMessages from "~/messages/en-US/navigation.newsletter.json"
import validations from "~/messages/en-US/newsletter-issue.validations.json"
import adminLabels from "~/messages/en-US/pages.admin.json"
import composeMessages from "~/messages/en-US/pages.admin.newsletter.compose.json"
import newsletterMessages from "~/messages/en-US/pages.admin.newsletter.json"
import { ROUTES } from "~/src/routes"
import { routeTree } from "~/src/routeTree.gen"

const mutations = vi.hoisted(() => ({
  createNewsletterIssue: vi.fn<NonNullable<typeof createNewsletterIssueMutation.mutationFn>>(),
  sendNewsletterIssue: vi.fn<NonNullable<typeof sendNewsletterIssueMutation.mutationFn>>(),
}))

vi.mock("@tanstack/react-router", async (importOriginal) => ({ ...(await importOriginal<typeof RouterModule>()), Outlet: () => null }))
vi.mock(import("~/src/modules/newsletter-issue/use-cases/create-newsletter-issue"), () => ({
  createNewsletterIssueMutation: { mutationFn: mutations.createNewsletterIssue, mutationKey: NEWSLETTER_ISSUE_MUTATION_KEYS.CREATE },
}))
vi.mock(import("~/src/modules/newsletter-issue/use-cases/send-newsletter-issue"), () => ({
  sendNewsletterIssueMutation: { mutationFn: mutations.sendNewsletterIssue, mutationKey: NEWSLETTER_ISSUE_MUTATION_KEYS.SEND },
}))

const { subscribers, issues } = newsletterMessages
const { toolbar } = gridMessages
const POLISH = "pl-PL"
const fixtureMoment = fixtureDate.toISOString()

const progress = (overrides: Partial<NewsletterIssue["progress"]> = {}): NewsletterIssue["progress"] => ({
  isClaimed: true,
  issueId: "issue-two",
  recipientCount: 2,
  sentCount: 2,
  status: NEWSLETTER_ISSUE_STATUS.SENT,
  ...overrides,
})

const cellsOf = (row: HTMLElement): string[] =>
  within(row)
    .getAllByRole("cell", { hidden: true })
    .map((cell) => cell.textContent)

const bodyRows = (): HTMLElement[] => screen.getAllByRole("row", { hidden: true }).slice(1)

const exportedLines = async (user: ReturnType<typeof userEvent.setup>): Promise<string[]> => {
  await user.click(screen.getByRole("button", { name: toolbar.export }))
  await waitFor(() => {
    expect(download.downloadFile).toHaveBeenCalledOnce()
  })
  return vi.mocked(download.downloadFile).mock.calls[0]?.[0].content.replace("﻿", "").trim().split("\r\n") ?? []
}

const showColumn = async (user: ReturnType<typeof userEvent.setup>, name: string): Promise<void> => {
  await user.click(screen.getByRole("button", { name: toolbar.columns }))
  await user.click(screen.getByRole("menuitemcheckbox", { name }))
  await user.keyboard("{Escape}")
  await waitFor(() => {
    expect(screen.queryByRole("menu")).not.toBeInTheDocument()
  })
}

const renderSubscribers = (rows: readonly NewsletterSubscriber["listRow"][]) => {
  const queryClient = adminQueryClient()
  queryClient.setQueryData(listNewsletterSubscribersQuery.queryKey, { rows: [...rows], total: rows.length })
  queryClient.setQueryData(listNewsletterSubscribersPageQuery({ pageSize: MAX_PAGE_SIZE }).queryKey, {
    rows: [...rows],
    total: rows.length,
  })
  return renderAdminPage(SubscribersRoute.options.component, { path: ROUTES.ADMIN.NEWSLETTER.INDEX, queryClient })
}

const renderIssues = (rows: readonly NewsletterIssue["listRow"][]) => {
  const queryClient = adminQueryClient()
  queryClient.setQueryData(getNewsletterIssuesQuery.queryKey, { rows: [...rows], total: rows.length })
  queryClient.setQueryData(getNewsletterIssuesPageQuery({ pageSize: MAX_PAGE_SIZE }).queryKey, { rows: [...rows], total: rows.length })
  vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue()
  return renderAdminPage(IssuesRoute.options.component, { path: ROUTES.ADMIN.NEWSLETTER.ISSUES, queryClient })
}

const renderCompose = (recipients: number) => {
  const queryClient = adminQueryClient()
  queryClient.setQueryData(newsletterSubscribersQuery.queryKey, { total: recipients })
  vi.spyOn(queryClient, "invalidateQueries").mockResolvedValue()
  const rendered = renderAdminPage(ComposeRoute.options.component, { path: ROUTES.ADMIN.NEWSLETTER.COMPOSE, queryClient })
  const navigate = vi.spyOn(rendered.router, "navigate").mockResolvedValue()
  return { ...rendered, navigate, user: userEvent.setup({ delay: null }) }
}

const fill = async (user: ReturnType<typeof userEvent.setup>, label: string, text: string): Promise<void> => {
  await user.click(screen.getByLabelText(label))
  await user.paste(text)
}

const chooseLanguage = async (user: ReturnType<typeof userEvent.setup>, locale: string): Promise<void> => {
  await user.click(screen.getByRole("button", { name: new RegExp(adminLabels.components.formLanguages.label, "u") }))
  await user.click(await screen.findByRole("option", { name: new RegExp(locale, "u") }))
}

const writeEnglishIssue = async (user: ReturnType<typeof userEvent.setup>): Promise<void> => {
  await fill(user, composeMessages.form.subject, "Issue two")
  await fill(user, composeMessages.form.body, "First paragraph.\n\nSecond paragraph.")
}

const preview = (): HTMLElement => screen.getByRole("region", { name: composeMessages.preview.title })

beforeEach(() => {
  vi.spyOn(download, "downloadFile").mockImplementation(() => {})
  vi.spyOn(toast, "success").mockReturnValue(0)
  vi.spyOn(toast, "error").mockReturnValue(0)
  vi.spyOn(toast, "info").mockReturnValue(0)
  mutations.createNewsletterIssue.mockImplementation(({ issueId }) => Promise.resolve({ issueId }))
  mutations.sendNewsletterIssue.mockResolvedValue(progress())
})

afterEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  vi.restoreAllMocks()
})

describe("newsletter layout", () => {
  it.each([
    [ROUTES.ADMIN.NEWSLETTER.INDEX, navigationMessages.tabs.subscribers],
    [ROUTES.ADMIN.NEWSLETTER.ISSUES, navigationMessages.tabs.issues],
    ["/admin/newsletter/elsewhere", navigationMessages.tabs.subscribers],
  ])("names the page, links both tabs and New issue, and selects the tab of %s", (path, selected) => {
    renderAdminPage(NewsletterLayoutRoute.options.component, { path })

    expect(screen.getByRole("heading", { level: 1, name: newsletterMessages.title })).toBeVisible()
    expect(screen.getByRole("tab", { name: navigationMessages.tabs.subscribers })).toHaveAttribute("href", ROUTES.ADMIN.NEWSLETTER.INDEX)
    expect(screen.getByRole("tab", { name: navigationMessages.tabs.issues })).toHaveAttribute("href", ROUTES.ADMIN.NEWSLETTER.ISSUES)
    expect(screen.getByRole("tab", { selected: true })).toHaveAccessibleName(selected)
    expect(screen.getByRole("link", { name: newsletterMessages.newIssue })).toHaveAttribute("href", ROUTES.ADMIN.NEWSLETTER.COMPOSE)
  })
})

describe("newsletter subscribers", () => {
  it("lists each address with its status, sign-up and confirmation days and language", () => {
    renderSubscribers([
      newsletterSubscriberRow(),
      newsletterSubscriberRow({
        email: "grace@example.test",
        id: "subscriber-grace",
        locale: POLISH,
        status: NEWSLETTER_STATUS.PENDING,
        subscribedAt: null,
      }),
    ])

    expect(screen.getByRole("table", { name: subscribers.title })).toBeVisible()
    expect(screen.getAllByRole("columnheader").map((cell) => cell.textContent)).toStrictEqual([
      "",
      subscribers.table.email,
      subscribers.table.status,
      subscribers.table.createdAt,
      subscribers.table.subscribedAt,
      subscribers.table.locale,
    ])
    const [ada, grace] = bodyRows()
    expect(cellsOf(ada ?? document.body)).toStrictEqual([
      "",
      "ada@example.test",
      subscribers.status.subscribed,
      "Jan 1, 2025",
      "Jan 1, 2025",
      locales[I18N.DEFAULT_LOCALE],
    ])
    expect(cellsOf(grace ?? document.body)).toStrictEqual([
      "",
      "grace@example.test",
      subscribers.status.pending,
      "Jan 1, 2025",
      subscribers.notConfirmed,
      locales[POLISH],
    ])
  })

  it("exports the subscribers to a CSV that a spreadsheet shows as text, formulas included", async () => {
    const user = userEvent.setup()
    renderSubscribers([
      newsletterSubscriberRow({ email: "=cmd@example.test", source: NEWSLETTER_SOURCE.BLOG }),
      newsletterSubscriberRow({ email: "+1@example.test", id: "plus", status: NEWSLETTER_STATUS.UNSUBSCRIBED, subscribedAt: null }),
      newsletterSubscriberRow({ email: "@at@example.test", id: "at", source: NEWSLETTER_SOURCE.APP }),
    ])

    await showColumn(user, subscribers.table.source)
    expect(cellsOf(bodyRows()[0] ?? document.body)).toContain(subscribers.source.blog)

    expect(await exportedLines(user)).toStrictEqual([
      [
        subscribers.table.email,
        subscribers.table.status,
        subscribers.table.createdAt,
        subscribers.table.subscribedAt,
        subscribers.table.locale,
        subscribers.table.source,
      ].join(","),
      `'=cmd@example.test,${subscribers.status.subscribed},${fixtureMoment},${fixtureMoment},${I18N.DEFAULT_LOCALE},${subscribers.source.blog}`,
      `'+1@example.test,${subscribers.status.unsubscribed},${fixtureMoment},,${I18N.DEFAULT_LOCALE},${subscribers.source.footer}`,
      `'@at@example.test,${subscribers.status.subscribed},${fixtureMoment},${fixtureMoment},${I18N.DEFAULT_LOCALE},${subscribers.source.app}`,
    ])
  })

  it("says that nobody signed up yet", () => {
    renderSubscribers([])

    expect(screen.getByRole("status")).toHaveTextContent(subscribers.empty)
  })
})

describe("newsletter issues", () => {
  it("lists each issue with its status, progress, languages and days, and exports them", async () => {
    const user = userEvent.setup()
    renderIssues([
      newsletterIssueRow({ locales: [I18N.DEFAULT_LOCALE, POLISH] }),
      newsletterIssueRow({ id: "issue-two", sentAt: null, sentCount: 1, status: NEWSLETTER_ISSUE_STATUS.SENDING, subject: "Issue two" }),
    ])

    const [sent, sending] = bodyRows()
    expect(cellsOf(sent ?? document.body)).toStrictEqual([
      "Issue one",
      issues.status.sent,
      "3 of 3",
      "2 languages",
      "Jan 1, 2025",
      "Jan 1, 2025",
      "",
    ])
    expect(cellsOf(sending ?? document.body).slice(0, -1)).toStrictEqual([
      "Issue two",
      issues.status.sending,
      "1 of 3",
      "1 language",
      "Jan 1, 2025",
      issues.notSent,
    ])
    expect(within(sent ?? document.body).queryByRole("button")).toBeNull()

    expect(await exportedLines(user)).toStrictEqual([
      [
        issues.table.subject,
        issues.table.status,
        issues.table.recipients,
        issues.table.locales,
        issues.table.createdAt,
        issues.table.sentAt,
      ].join(","),
      `Issue one,${issues.status.sent},3,${I18N.DEFAULT_LOCALE} ${POLISH},${fixtureMoment},${fixtureMoment}`,
      `Issue two,${issues.status.sending},1,${I18N.DEFAULT_LOCALE},${fixtureMoment},`,
    ])
  })

  it.each([
    {
      answer: progress(),
      message: issues.feedback.sent.replace("{count, plural, one {# subscriber} other {# subscribers}}", "2 subscribers"),
      notice: () => toast.success,
      state: "sent",
    },
    {
      answer: progress({ isClaimed: false, status: NEWSLETTER_ISSUE_STATUS.SENDING }),
      message: issues.feedback.busy,
      notice: () => toast.info,
      state: "already being sent",
    },
  ])("resumes an interrupted issue from its row menu and says when it is $state", async ({ answer, message, notice }) => {
    const user = userEvent.setup()
    mutations.sendNewsletterIssue.mockResolvedValueOnce(answer)
    renderIssues([
      newsletterIssueRow({ id: "issue-two", sentAt: null, sentCount: 1, status: NEWSLETTER_ISSUE_STATUS.SENDING, subject: "Issue two" }),
    ])

    await user.click(screen.getByRole("button", { name: issues.menu.replace("{subject}", "Issue two") }))
    await user.click(screen.getByRole("menuitem", { name: issues.resume }))

    await waitFor(() => {
      expect(notice()).toHaveBeenCalledWith(message)
    })
    expect(mutations.sendNewsletterIssue).toHaveBeenCalledWith({ issueId: "issue-two" }, expect.anything())
  })

  it("explains a failed resume", async () => {
    const user = userEvent.setup()
    mutations.sendNewsletterIssue.mockRejectedValueOnce(new Error(ERROR_CODES.INTERNAL_ERROR))
    renderIssues([newsletterIssueRow({ status: NEWSLETTER_ISSUE_STATUS.SENDING })])

    await user.click(screen.getByRole("button", { name: issues.menu.replace("{subject}", "Issue one") }))
    await user.click(screen.getByRole("menuitem", { name: issues.resume }))

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errors.codes.INTERNAL_ERROR)
    })
  })
})

describe("writing an issue", () => {
  it("cannot send while nobody has confirmed", () => {
    renderCompose(0)

    expect(screen.getByText(composeMessages.form.recipients.replace(/^.*=0 \{(?<none>[^}]+)\}.*$/u, "$<none>"))).toBeVisible()
    expect(screen.getByRole("button", { name: composeMessages.form.send })).toBeDisabled()
  })

  it("asks for the English subject and body before it sends", async () => {
    const { user } = renderCompose(2)

    expect(within(preview()).getByText(composeMessages.preview.noSubject)).toBeVisible()
    await user.click(screen.getByRole("button", { name: composeMessages.form.send }))

    expect(await screen.findAllByText(validations.defaultLocaleRequired)).toHaveLength(2)
    expect(mutations.createNewsletterIssue).not.toHaveBeenCalled()
  })

  it("previews the issue and shows English to readers of an incomplete language", async () => {
    const { user } = renderCompose(2)

    await writeEnglishIssue(user)
    expect(within(preview()).getByText("Issue two")).toBeVisible()
    expect(within(preview()).getByText("Second paragraph.")).toBeVisible()

    await chooseLanguage(user, POLISH)
    expect(preview()).toHaveTextContent(composeMessages.preview.fallback.replace("{language}", locales[I18N.DEFAULT_LOCALE]))
    expect(within(preview()).getByText("Issue two").closest("[lang]")).toHaveAttribute("lang", I18N.DEFAULT_LOCALE)
    await fill(user, composeMessages.form.subject, "Numer drugi")
    await user.click(screen.getByRole("button", { name: composeMessages.form.send }))
    expect(await screen.findByText(validations.translationIncomplete)).toBeVisible()
    expect(mutations.createNewsletterIssue).not.toHaveBeenCalled()
  })

  it("sends an issue in two languages after confirming and opens the issues", async () => {
    const { navigate, user } = renderCompose(2)

    await writeEnglishIssue(user)
    await chooseLanguage(user, POLISH)
    await fill(user, composeMessages.form.subject, "Numer drugi")
    await fill(user, composeMessages.form.body, "Treść.")
    expect(within(preview()).getByText("Numer drugi")).toBeVisible()
    await user.click(screen.getByRole("button", { name: composeMessages.form.send }))
    const dialog = await screen.findByRole("alertdialog", { name: composeMessages.confirm.title })
    expect(dialog).toHaveTextContent("2 confirmed subscribers get it")
    await user.click(within(dialog).getByRole("button", { name: composeMessages.confirm.send }))

    await waitFor(() => {
      expect(navigate).toHaveBeenCalledWith({ to: ROUTES.ADMIN.NEWSLETTER.ISSUES })
    })
    const created = mutations.createNewsletterIssue.mock.calls[0]?.[0]
    expect(created).toMatchObject({
      body: { [I18N.DEFAULT_LOCALE]: "First paragraph.\n\nSecond paragraph.", [POLISH]: "Treść." },
      subject: { [I18N.DEFAULT_LOCALE]: "Issue two", [POLISH]: "Numer drugi" },
    })
    expect(created?.issueId).toMatch(/^[\da-f]{8}-[\da-f]{4}-7/u)
    expect(mutations.sendNewsletterIssue).toHaveBeenCalledWith({ issueId: created?.issueId }, expect.anything())
  })

  it("keeps the page when the issue is still being sent elsewhere, and explains a failed save", async () => {
    const { navigate, user } = renderCompose(1)
    mutations.sendNewsletterIssue.mockResolvedValueOnce(progress({ isClaimed: false, status: NEWSLETTER_ISSUE_STATUS.SENDING }))

    await fill(user, composeMessages.form.subject, "Issue three")
    await fill(user, composeMessages.form.body, "Body.")
    await user.click(screen.getByRole("button", { name: composeMessages.form.send }))
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: composeMessages.confirm.send }))
    await waitFor(() => {
      expect(toast.info).toHaveBeenCalledWith(issues.feedback.busy)
    })
    expect(navigate).not.toHaveBeenCalled()

    mutations.createNewsletterIssue.mockRejectedValueOnce(new Error(ERROR_CODES.TOO_MANY_REQUESTS))
    await user.click(screen.getByRole("button", { name: composeMessages.form.send }))
    await user.click(within(await screen.findByRole("alertdialog")).getByRole("button", { name: composeMessages.confirm.send }))
    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledWith(errors.codes.TOO_MANY_REQUESTS)
    })
    const ids = mutations.createNewsletterIssue.mock.calls.map(([texts]) => texts.issueId)
    expect(ids).toHaveLength(2)
    expect(new Set(ids).size).toBe(1)
  })
})

describe("newsletter skeletons", () => {
  it.each([
    [ROUTES.ADMIN.NEWSLETTER.INDEX, AdminNewsletterSubscribersPending],
    [`/${POLISH}${ROUTES.ADMIN.NEWSLETTER.ISSUES}`, AdminNewsletterIssuesPending],
  ])("mirrors the tab at %s inside the layout skeleton", (path, Page) => {
    const page = markupOf(<Page />)
    const { container } = renderWithRouter(<AdminNewsletterPending />, { router: createTestRouter(path, routeTree) })

    expect(busyMarkup(container)).toBe(page)
  })

  it.each([
    [ROUTES.ADMIN.NEWSLETTER.INDEX, AdminNewsletterSubscribersPending],
    [ROUTES.ADMIN.NEWSLETTER.COMPOSE, AdminNewsletterComposePending],
  ])("shows the skeleton of %s when it is entered from outside the admin", (path, Page) => {
    const page = markupOf(<Page />)
    const { container } = renderWithRouter(<AdminPending />, { router: createTestRouter(path, routeTree) })

    expect(container.innerHTML).toContain(page)
  })
})
