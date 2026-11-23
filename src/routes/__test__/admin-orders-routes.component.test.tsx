import { QueryClientProvider } from "@tanstack/react-query"
import { Outlet, RouterProvider, createMemoryHistory, createRootRouteWithContext, createRouter } from "@tanstack/react-router"
import { act, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { IntlProvider } from "use-intl/react"
import { afterEach, beforeEach, describe, expect, it, vi } from "vite-plus/test"

import { createTestRouter, renderWithRouter } from "~/src/platform/testing/lib/render"
import { busyMarkup, markupOf } from "~/src/platform/testing/lib/skeleton"

import { POLAR_ORDER_STATUS } from "~/src/integrations/polar/polar.constants"
import { I18N } from "~/src/integrations/use-intl/i18n.config"
import { LOCALE_REWRITE } from "~/src/integrations/use-intl/i18n.utils"

import { MAX_PAGE_SIZE } from "~/src/modules/_core/utils/pagination"
import { LICENSE_MACHINES } from "~/src/modules/license/license.constants"
import { userActivationsQuery } from "~/src/modules/license/use-cases/get-user-activations"
import { POLAR_READ } from "~/src/modules/order/order.constants"
import type { Order } from "~/src/modules/order/order.types"
import { getCustomersPageQuery, getCustomersQuery } from "~/src/modules/order/use-cases/get-customers"
import { getOrderQuery } from "~/src/modules/order/use-cases/get-order"
import { orderFiltersQuery } from "~/src/modules/order/use-cases/get-order-filters"
import { getOrdersPageQuery, getOrdersQuery } from "~/src/modules/order/use-cases/get-orders"
import { userOrdersQuery } from "~/src/modules/order/use-cases/get-user-orders"

import { Route as OrderRoute } from "~/src/routes/admin.orders.$orderId"
import { Route as OrdersRoute } from "~/src/routes/admin.orders.index"
import { Route as CustomersRoute } from "~/src/routes/admin.users.customers"

import * as download from "~/src/lib/download"

import { adminUser } from "~/src/presentation/components/custom/admin/__test__/auth.fixtures"
import { fixtureDate } from "~/src/presentation/components/custom/admin/__test__/fixture-date"
import { adminMessages, adminQueryClient, renderAdmin, renderAdminPage } from "~/src/presentation/components/custom/admin/__test__/fixtures"
import {
  adminCustomerRow,
  adminOrderDetail,
  adminOrderRow,
  adminPolarOrder,
} from "~/src/presentation/components/custom/admin/__test__/orders.fixtures"
import { AdminPending } from "~/src/presentation/components/custom/admin/admin-pending"
import { AdminUsersPending } from "~/src/presentation/components/custom/admin/admin-users-pending"
import { AdminCustomersPending, AdminOrderPending, AdminOrdersPending } from "~/src/presentation/components/custom/admin/payments-pending"
import { UserOrders } from "~/src/presentation/components/custom/admin/payments/user-orders"

import gridMessages from "~/messages/en-US/components.custom.data-grid.json"
import countriesMessages from "~/messages/en-US/countries.json"
import customersMessages from "~/messages/en-US/pages.admin.customers.json"
import ordersMessages from "~/messages/en-US/pages.admin.orders.json"
import licenseMessages from "~/messages/en-US/pages.admin.users.license.json"
import type { RouterContext } from "~/src/router"
import { ROUTES } from "~/src/routes"
import { routeTree } from "~/src/routeTree.gen"

const { detail } = ordersMessages
const polarLabels = detail.polar

afterEach(() => vi.restoreAllMocks())

const cellsOf = (row: HTMLElement): string[] =>
  within(row)
    .getAllByRole("cell")
    .map((cell) => cell.textContent)

const bodyRows = (): HTMLElement[] => screen.getAllByRole("row", { hidden: true }).slice(1)

const cardOf = (title: string): HTMLElement => {
  const card = screen.getByRole("heading", { level: 2, name: title }).closest<HTMLElement>("[data-slot=card]")
  if (card === null) {
    throw new Error(`${title} is outside a card`)
  }
  return card
}

const valueIn = (title: string, term: string): Element | null =>
  within(cardOf(title)).getByText(term, { exact: true, selector: "dt" }).nextElementSibling

const valueOf = (term: string): Element | null => valueIn(detail.mirror.title, term)

const polarValue = (term: string): Element | null => valueIn(polarLabels.title, term)

const renderOrders = (rows: readonly Order["listRow"][]) => {
  const queryClient = adminQueryClient()
  queryClient.setQueryData(getOrdersQuery.queryKey, { rows: [...rows], total: rows.length })
  queryClient.setQueryData(getOrdersPageQuery({ pageSize: MAX_PAGE_SIZE }).queryKey, { rows: [...rows], total: rows.length })
  queryClient.setQueryData(orderFiltersQuery.queryKey, {
    countries: ["DE", "PL"],
    discounts: [
      { code: "LAUNCH", id: "dsc_launch", name: "Launch week" },
      { code: null, id: "dsc_partner", name: null },
    ],
    products: [{ id: "prod_agency", name: "Agency" }],
  })
  return renderAdminPage(OrdersRoute.options.component, { queryClient })
}

const renderOrder = async (polar: Order["detail"]["polar"], order: Order["detail"]["order"] = adminOrderDetail()) => {
  const queryClient = adminQueryClient()
  queryClient.setQueryData(getOrderQuery({ orderId: order.id }).queryKey, {
    order,
    polar,
    polarUrl: `https://sandbox.polar.sh/dashboard/saasyland/sales/${order.id}`,
  })
  const root = createRootRouteWithContext<RouterContext>()({ component: Outlet })
  Object.assign(OrderRoute.options, {
    getParentRoute: () => root,
    id: "/admin/orders/$orderId",
    loader: () => ({ locale: "en-US", pathname: `${ROUTES.ADMIN_ORDERS}/${order.id}`, title: order.description }),
    path: "/admin/orders/$orderId",
  })
  const router = createRouter({
    context: { queryClient },
    defaultPendingMinMs: 0,
    history: createMemoryHistory({ initialEntries: [`${ROUTES.ADMIN_ORDERS}/${order.id}`] }),
    rewrite: LOCALE_REWRITE,
    routeTree: root.addChildren([OrderRoute]),
  })
  render(
    <QueryClientProvider client={queryClient}>
      <IntlProvider formats={I18N.FORMATS} locale="en-US" messages={adminMessages} timeZone={I18N.DEFAULT_TIMEZONE}>
        <RouterProvider router={router} />
      </IntlProvider>
    </QueryClientProvider>,
  )
  await act(() => router.load())
}

const { filters: gridFilters, toolbar: gridToolbar } = gridMessages

const fixtureMoment = fixtureDate.toISOString()

const ORDER_HEADERS = ["", "placedAt", "customer", "product", "totalAmount", "discount", "country", "status"] as const

const headerOf = (id: (typeof ORDER_HEADERS)[number]): string => (id === "" ? "" : ordersMessages.table.headers[id])

describe("orders page", () => {
  beforeEach(() => {
    vi.spyOn(download, "downloadFile").mockImplementation(() => {})
  })

  afterEach(() => {
    localStorage.clear()
  })

  it("lists each order with its date, account, product, total, refund and status, and links it to its page", () => {
    renderOrders([
      adminOrderRow({ refunded: { amount: 50, currency: "USD" }, status: POLAR_ORDER_STATUS.PARTIALLY_REFUNDED }),
      adminOrderRow({
        billingCountry: undefined,
        customerId: "cus_guest",
        description: "Agency",
        discount: { amount: { amount: 71.92, currency: "EUR" }, code: "LAUNCH", id: "dsc_launch", name: "Launch week" },
        id: "ord_guest",
        total: { amount: 719.2, currency: "EUR" },
        user: null,
      }),
    ])

    expect(screen.getByRole("heading", { level: 1, name: ordersMessages.title })).toBeVisible()
    expect(screen.getByRole("table", { name: ordersMessages.title })).toBeVisible()
    expect(screen.getAllByRole("columnheader").map((cell) => cell.textContent)).toStrictEqual(ORDER_HEADERS.map((id) => headerOf(id)))
    const [partly, guest] = bodyRows()
    expect(cellsOf(partly ?? document.body)).toStrictEqual([
      "",
      "Jan 1, 2025, 12:00 PM UTCord_complete",
      "Ada Lovelaceada@example.com",
      "Complete",
      "$199.00$50.00 refunded",
      ordersMessages.table.noDiscount,
      countriesMessages.DE,
      ordersMessages.status.partially_refunded,
    ])
    expect(within(partly ?? document.body).getByRole("link", { name: /ord_complete/u })).toHaveAttribute(
      "href",
      "/admin/orders/ord_complete",
    )
    expect(within(partly ?? document.body).getByRole("link", { name: "Ada Lovelace" })).toHaveAttribute("href", "/admin/users/ada")
    expect(cellsOf(guest ?? document.body)).toStrictEqual([
      "",
      "Jan 1, 2025, 12:00 PM UTCord_guest",
      `${ordersMessages.customer.noAccount}cus_guest`,
      "Agency",
      "€719.20",
      "Launch week (LAUNCH)€71.92",
      ordersMessages.table.noCountry,
      ordersMessages.status.paid,
    ])
  })

  it("shows the refunded amount in its own column when the admin turns it on", async () => {
    const user = userEvent.setup()
    renderOrders([adminOrderRow({ id: "ord_refunded", refunded: { amount: 50, currency: "USD" } }), adminOrderRow()])

    await user.click(screen.getByRole("button", { name: gridToolbar.columns }))
    await user.click(screen.getByRole("menuitemcheckbox", { name: ordersMessages.table.headers.refundedAmount }))
    await user.keyboard("{Escape}")

    const index = screen
      .getAllByRole("columnheader", { hidden: true })
      .findIndex((cell) => cell.textContent === ordersMessages.table.headers.refundedAmount)
    expect(bodyRows().map((row) => within(row).getAllByRole("cell", { hidden: true })[index]?.textContent)).toStrictEqual([
      "$50.00",
      ordersMessages.table.noRefund,
    ])
  })
})

describe("orders page filters and export", () => {
  beforeEach(() => {
    vi.spyOn(download, "downloadFile").mockImplementation(() => {})
  })

  afterEach(() => {
    localStorage.clear()
  })

  it("filters by the customer, product, total, discount, billing country, status and the day the order was placed", async () => {
    const user = userEvent.setup()
    renderOrders([])

    expect(screen.getByRole("searchbox", { name: ordersMessages.filters.search })).toBeVisible()
    await user.click(screen.getByRole("button", { name: gridFilters.filter }))
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toStrictEqual([
      ordersMessages.table.headers.placedAt,
      ordersMessages.table.headers.customer,
      ordersMessages.table.headers.product,
      ordersMessages.table.headers.totalAmount,
      ordersMessages.table.headers.discount,
      ordersMessages.table.headers.country,
      ordersMessages.table.headers.status,
    ])

    await user.click(screen.getByRole("option", { name: ordersMessages.table.headers.discount }))
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toStrictEqual([
      ordersMessages.filters.discounts.any,
      ordersMessages.filters.discounts.none,
      "Launch week (LAUNCH)",
      "dsc_partner",
    ])

    await user.click(screen.getByRole("button", { name: gridFilters.back }))
    await user.click(screen.getByRole("option", { name: ordersMessages.table.headers.country }))
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toStrictEqual([countriesMessages.DE, countriesMessages.PL])

    await user.click(screen.getByRole("button", { name: gridFilters.back }))
    await user.click(screen.getByRole("option", { name: ordersMessages.table.headers.status }))
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toStrictEqual(Object.values(ordersMessages.status))

    await user.click(screen.getByRole("button", { name: gridFilters.back }))
    await user.click(screen.getByRole("option", { name: ordersMessages.table.headers.product }))
    expect(screen.getAllByRole("option").map((option) => option.textContent)).toStrictEqual(["Agency"])
  })

  it("exports the orders with the customer, money, discount, country and status a spreadsheet can read", async () => {
    const user = userEvent.setup()
    renderOrders([
      adminOrderRow(),
      adminOrderRow({
        billingCountry: undefined,
        customerId: "cus_guest",
        discount: { amount: { amount: 71.92, currency: "EUR" }, code: null, id: "dsc_partner", name: null },
        id: "ord_guest",
        status: POLAR_ORDER_STATUS.REFUNDED,
        total: { amount: 3000, currency: "JPY" },
        user: null,
      }),
    ])

    await user.click(screen.getByRole("button", { name: gridToolbar.columns }))
    await user.click(screen.getByRole("menuitemcheckbox", { name: ordersMessages.table.headers.refundedAmount }))
    await user.keyboard("{Escape}")
    await waitFor(() => {
      expect(screen.queryByRole("menu")).not.toBeInTheDocument()
    })
    await user.click(screen.getByRole("button", { name: gridToolbar.export }))

    await waitFor(() => {
      expect(download.downloadFile).toHaveBeenCalledOnce()
    })
    expect(vi.mocked(download.downloadFile).mock.calls[0]?.[0].content.split("\r\n").slice(0, 3)).toStrictEqual([
      "\uFEFFPlaced,Customer,Product,Total,Refunded,Discount,Country,Status",
      `${fixtureMoment},Ada Lovelace <ada@example.com>,Complete,199.00 USD,0.00 USD,,DE,Paid`,
      `${fixtureMoment},cus_guest,Complete,3000 JPY,0.00 USD,dsc_partner,,Refunded`,
    ])
  })

  it("says that no orders exist yet while no filter is set", () => {
    renderOrders([])

    expect(screen.getByRole("status")).toHaveTextContent(ordersMessages.empty)
  })

  it("mirrors the page in its skeleton", () => {
    const page = markupOf(<AdminOrdersPending />)
    const { container } = renderWithRouter(<AdminPending />, { router: createTestRouter("/admin/orders", routeTree) })

    expect(busyMarkup(container)).toBe(page)
  })
})

describe("order page", () => {
  it("shows the saved copy, the account and Polar's live payment with its discount code, country and invoice", async () => {
    await renderOrder(adminPolarOrder())

    expect(screen.getByRole("heading", { level: 1, name: "Complete" })).toBeVisible()
    expect(screen.getByRole("link", { name: detail.openInPolar })).toHaveAttribute(
      "href",
      "https://sandbox.polar.sh/dashboard/saasyland/sales/ord_complete",
    )
    expect(screen.getByRole("link", { name: detail.back })).toHaveAttribute("href", ROUTES.ADMIN_ORDERS)
    expect(valueOf(detail.mirror.fields.invoiceNumber)).toHaveTextContent("SAASY-0001")
    expect(valueOf(detail.mirror.fields.subscription)).toHaveTextContent(detail.none)
    expect(valueOf(detail.mirror.fields.customerId)).toHaveTextContent("cus_ada")
    expect(valueOf(detail.mirror.fields.discount)).toHaveTextContent("Launch week (LAUNCH)")
    expect(valueOf(detail.mirror.fields.discountAmount)).toHaveTextContent("$49.75")
    expect(valueOf(detail.mirror.fields.billingCountry)).toHaveTextContent(countriesMessages.DE)
    expect(screen.getByRole("link", { name: "Ada Lovelace" })).toHaveAttribute("href", "/admin/users/ada")
    expect(polarValue(polarLabels.amounts.subtotal)).toHaveTextContent("$248.75")
    expect(polarValue(polarLabels.amounts.discount)).toHaveTextContent("$49.75")
    expect(polarValue(polarLabels.amounts.refundedTax)).toHaveTextContent("$1.60")
    expect(polarValue(polarLabels.fields.discountName)).toHaveTextContent("Launch week (LAUNCH)")
    expect(polarValue(polarLabels.fields.billingCountry)).toHaveTextContent(countriesMessages.DE)
    expect(polarValue(polarLabels.fields.billingName)).toHaveTextContent("Ada GmbH")
    expect(screen.getByRole("link", { name: polarLabels.invoice })).toHaveAttribute(
      "href",
      "https://sandbox.polar.sh/invoices/ord_complete.pdf",
    )
  })

  it("names a discount without a code and says what Polar did not give", async () => {
    await renderOrder(
      {
        ...adminPolarOrder(),
        billingCountry: undefined,
        billingName: null,
        customerEmail: undefined,
        customerName: "",
        discountCode: null,
        invoiceUrl: undefined,
      },
      adminOrderDetail({ billingCountry: undefined, discount: undefined, invoiceNumber: null, subscriptionId: "sub_monthly" }),
    )

    expect(valueOf(detail.mirror.fields.discount)).toHaveTextContent(detail.none)
    expect(valueOf(detail.mirror.fields.discountAmount)).toHaveTextContent(detail.none)
    expect(valueOf(detail.mirror.fields.billingCountry)).toHaveTextContent(detail.none)

    expect(polarValue(polarLabels.fields.discountName)).toHaveTextContent("Launch week")
    expect(polarValue(polarLabels.fields.billingCountry)).toHaveTextContent(detail.none)
    expect(polarValue(polarLabels.fields.billingName)).toHaveTextContent(detail.none)
    expect(polarValue(polarLabels.fields.customerEmail)).toHaveTextContent(detail.none)
    expect(polarValue(polarLabels.fields.customerName)).toHaveTextContent(detail.none)
    expect(valueOf(detail.mirror.fields.invoiceNumber)).toHaveTextContent(detail.none)
    expect(valueOf(detail.mirror.fields.subscription)).toHaveTextContent("sub_monthly")
    expect(screen.getByText(polarLabels.noInvoice)).toBeVisible()
  })

  it("says when the saved copy does not hold the discount and billing country yet", async () => {
    await renderOrder(adminPolarOrder(), adminOrderDetail({ billingCountry: undefined, discount: undefined, termsCopied: false }))

    for (const field of [detail.mirror.fields.discount, detail.mirror.fields.discountAmount, detail.mirror.fields.billingCountry]) {
      expect(valueOf(field)).toHaveTextContent(detail.mirror.notCopied)
    }
  })

  it("says no discount applied when the order had none", async () => {
    await renderOrder({ ...adminPolarOrder(), discountCode: undefined, discountName: undefined })

    expect(polarValue(polarLabels.fields.discountName)).toHaveTextContent(detail.none)
  })

  it("keeps the saved copy and says so when Polar cannot be read, and says when no account matches", async () => {
    await renderOrder({ read: POLAR_READ.UNAVAILABLE }, adminOrderDetail({ user: null }))

    expect(screen.getByRole("status")).toHaveTextContent(polarLabels.unavailable.title)
    expect(screen.queryByText(polarLabels.amounts.subtotal)).toBeNull()
    expect(valueOf(detail.mirror.fields.total)).toHaveTextContent("$199.00")
    expect(screen.getByText(detail.account.none)).toBeVisible()
  })

  it("renders its skeleton while the order loads", () => {
    const { container } = render(<AdminOrderPending />)

    expect(container.querySelectorAll('[aria-busy="true"]')).toHaveLength(1)
  })
})

const renderCustomers = (rows: Order["customerRow"][]) => {
  const queryClient = adminQueryClient()
  queryClient.setQueryData(userActivationsQuery({ userIds: ["ada"] }).queryKey, {
    machines: [{ activations: [], limit: 3, state: LICENSE_MACHINES.LISTED, userId: "ada" }],
  })
  queryClient.setQueryData(getCustomersQuery.queryKey, { rows, total: rows.length })
  queryClient.setQueryData(getCustomersPageQuery({ pageSize: MAX_PAGE_SIZE }).queryKey, { rows, total: rows.length })
  renderAdminPage(CustomersRoute.options.component, { queryClient })
  return userEvent.setup()
}

const showVerification = async (user: ReturnType<typeof userEvent.setup>): Promise<void> => {
  await user.click(screen.getByRole("button", { name: gridToolbar.columns }))
  await user.click(screen.getByRole("menuitemcheckbox", { name: customersMessages.table.headers.emailVerified }))
  await user.keyboard("{Escape}")
}

describe("customers tab", () => {
  afterEach(() => {
    localStorage.clear()
  })

  const GUEST = adminCustomerRow({ customerId: "cus_guest", id: "cus_guest", orders: 1, revenue: [], user: null })

  const buyer = adminUser()

  const CUSTOMERS = [
    adminCustomerRow(),
    adminCustomerRow({
      customerId: "cus_unverified",
      id: "cus_unverified",
      user: { createdAt: buyer.createdAt, email: buyer.email, emailVerified: false, id: buyer.id, name: buyer.name },
    }),
    GUEST,
  ]

  it("lists each customer with their account, sign-up, orders, what they paid, their last order and their machines", () => {
    renderCustomers([adminCustomerRow(), GUEST])

    const { headers } = customersMessages.table
    expect(screen.getAllByRole("columnheader").map((cell) => cell.textContent)).toStrictEqual([
      headers.customer,
      headers.signedUpAt,
      headers.orders,
      headers.revenue,
      headers.lastOrderAt,
      licenseMessages.activations.header,
    ])
    const [ada, guest] = bodyRows()
    expect(cellsOf(ada ?? document.body)).toStrictEqual([
      "Ada Lovelaceada@example.com",
      "Jan 1, 2025, 12:00 PM UTC",
      "2",
      "€519.20$199.00",
      "Jan 1, 2025, 12:00 PM UTC",
      "0 of 3 machines in use",
    ])
    expect(cellsOf(guest ?? document.body)).toStrictEqual([
      `${customersMessages.table.noAccount}cus_guest`,
      customersMessages.table.noAccount,
      "1",
      customersMessages.table.noRevenue,
      "Jan 1, 2025, 12:00 PM UTC",
      customersMessages.table.noAccount,
    ])
    expect(screen.getByRole("searchbox", { name: customersMessages.search })).toBeVisible()
  })

  it("shows whether each account verified its email once the admin shows the column", async () => {
    const user = renderCustomers(CUSTOMERS)

    await showVerification(user)

    expect(bodyRows().map((cells) => cellsOf(cells)[2])).toStrictEqual([
      customersMessages.table.yes,
      customersMessages.table.no,
      customersMessages.table.noAccount,
    ])
  })

  it("exports the customers with their account, verification and what they paid in each currency", async () => {
    vi.spyOn(download, "downloadFile").mockImplementation(() => {})
    const user = renderCustomers(CUSTOMERS)
    await showVerification(user)

    await user.click(screen.getByRole("button", { name: gridToolbar.export }))

    await waitFor(() => {
      expect(download.downloadFile).toHaveBeenCalledOnce()
    })
    const [header, verified, unverified, guest] =
      vi.mocked(download.downloadFile).mock.calls[0]?.[0].content.replace("\uFEFF", "").split("\r\n") ?? []
    expect(header).toBe([...Object.values(customersMessages.table.headers), licenseMessages.activations.header].join(","))
    expect(verified).toBe("Ada Lovelace <ada@example.com>,2025-01-01T12:00:00.000Z,Yes,2,519.20 EUR; 199.00 USD,2025-01-01T12:00:00.000Z,")
    expect(unverified).toContain(",No,")
    expect(guest).toBe("cus_guest,,,1,,2025-01-01T12:00:00.000Z,")
  })

  it("mirrors the tab in the skeleton of user management", () => {
    const page = markupOf(<AdminCustomersPending />)
    const { container } = renderWithRouter(<AdminUsersPending />, { router: createTestRouter(ROUTES.ADMIN_USERS_CUSTOMERS, routeTree) })

    expect(container.innerHTML).toContain(page)
  })
})

describe("orders on a profile", () => {
  it("lists the account's orders with links and totals what it paid after refunds per currency", () => {
    const queryClient = adminQueryClient()
    queryClient.setQueryData(userOrdersQuery({ userId: "ada" }).queryKey, {
      orders: [
        {
          description: "Agency",
          id: "ord_agency",
          placedAt: new Date("2025-01-01T12:00:00Z"),
          refunded: { amount: 0, currency: "EUR" },
          status: POLAR_ORDER_STATUS.PAID,
          total: { amount: 719.2, currency: "EUR" },
        },
      ],
      revenue: [{ amount: 719.2, currency: "EUR" }],
    })
    renderAdmin(<UserOrders userId="ada" />, { queryClient })

    expect(screen.getByRole("heading", { level: 2, name: customersMessages.profile.title })).toBeVisible()
    expect(screen.getByRole("link", { name: /^Agency/u })).toHaveAttribute("href", "/admin/orders/ord_agency")
    expect(screen.getAllByText("€719.20")).toHaveLength(2)
  })

  it("says when the account has not ordered or paid", () => {
    renderAdmin(<UserOrders userId="ada" />)

    expect(screen.getByText(customersMessages.profile.none)).toBeVisible()
    expect(screen.getByText(customersMessages.table.noRevenue)).toBeVisible()
  })
})
