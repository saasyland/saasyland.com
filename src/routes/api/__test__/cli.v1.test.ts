import { API_BASE_PATH, API_ENDPOINT, LICENSE_PAGE_PATH, ROUTE_PARAMETER } from "@saasyland/stack/api"
import { expect, it, vi } from "vite-plus/test"

import { licenseApiHandlers } from "~/src/modules/license/license.api"
import { LICENSE_API_ENDPOINTS } from "~/src/modules/license/license.constants"

import { Route as ActivationsRoute } from "~/src/routes/api/cli.v1.activations"
import { Route as ActivationRoute } from "~/src/routes/api/cli.v1.activations.$activationId"
import { Route as LicenseRoute } from "~/src/routes/api/cli.v1.license"

import { getRouter } from "~/src/router"
import { ROUTES } from "~/src/routes"

vi.mock("collections/server", () => ({ blog: [], docs: { toFumadocsSource: () => ({ files: [] }) } }))

const ACTIVATION_ID = crypto.randomUUID()
const CONTRACT_SEGMENT = `:${ROUTE_PARAMETER.ACTIVATION_ID}`
const FILE_ROUTE_SEGMENT = `$${ROUTE_PARAMETER.ACTIVATION_ID}`
const SERVED_ENDPOINTS = new Set<string>(LICENSE_API_ENDPOINTS)

const CONTRACT_ROUTES = [
  { endpoint: API_ENDPOINT.LICENSE, name: "LICENSE", params: {}, route: LicenseRoute },
  { endpoint: API_ENDPOINT.ACTIVATE, name: "ACTIVATE", params: {}, route: ActivationsRoute },
  { endpoint: API_ENDPOINT.VALIDATE, name: "VALIDATE", params: { [ROUTE_PARAMETER.ACTIVATION_ID]: ACTIVATION_ID }, route: ActivationRoute },
  {
    endpoint: API_ENDPOINT.DEACTIVATE,
    name: "DEACTIVATE",
    params: { [ROUTE_PARAMETER.ACTIVATION_ID]: ACTIVATION_ID },
    route: ActivationRoute,
  },
]

const requestPath = (route: string): string => `${API_BASE_PATH}${route}`.replace(CONTRACT_SEGMENT, ACTIVATION_ID)

const fileRoutePath = (route: string): string => `${API_BASE_PATH}${route}`.replace(CONTRACT_SEGMENT, FILE_ROUTE_SEGMENT)

it.each(CONTRACT_ROUTES)(
  "routes the contract's $name path to its route file with the contract's parameters",
  ({ endpoint, params, route }) => {
    const [, routeParams, foundRoute] = getRouter().getMatchedRoutes(requestPath(endpoint.route))

    expect(foundRoute).toBe(route)
    expect(foundRoute?.fullPath).toBe(fileRoutePath(endpoint.route))
    expect({ ...routeParams }).toStrictEqual(params)
  },
)

it("serves exactly the endpoints that LICENSE_API_ENDPOINTS lists for the docs", () => {
  expect(CONTRACT_ROUTES.map(({ name }) => name)).toStrictEqual([...LICENSE_API_ENDPOINTS])
})

it.each(Object.entries(API_ENDPOINT).filter(([name]) => !SERVED_ENDPOINTS.has(name)))(
  "has no route file for the %s endpoint, which a later release adds",
  (_name, { route }) => {
    const [matchedRoutes] = getRouter().getMatchedRoutes(requestPath(route))

    expect(matchedRoutes.some(({ fullPath }) => fullPath === fileRoutePath(route))).toBe(false)
  },
)

it("answers each contract method with its licence API handler and no other method", () => {
  expect(LicenseRoute.options.server?.handlers).toStrictEqual({ [API_ENDPOINT.LICENSE.method]: licenseApiHandlers.license })
  expect(ActivationsRoute.options.server?.handlers).toStrictEqual({ [API_ENDPOINT.ACTIVATE.method]: licenseApiHandlers.activate })
  expect(ActivationRoute.options.server?.handlers).toStrictEqual({
    [API_ENDPOINT.DEACTIVATE.method]: licenseApiHandlers.deactivate,
    [API_ENDPOINT.VALIDATE.method]: licenseApiHandlers.validate,
  })
})

it("sends the CLI to the licence page this app serves", () => {
  expect(LICENSE_PAGE_PATH).toBe(ROUTES.APP_LICENSE)
})
