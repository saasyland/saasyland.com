import { API_BASE_PATH, API_ENDPOINT, LICENSE_PAGE_PATH, ROUTE_PARAMETER } from "@saasyland/stack/api"
import { expect, it, vi } from "vite-plus/test"

import { licenseApiHandlers } from "~/src/modules/license/license.api"
import { LICENSE_API_ENDPOINTS } from "~/src/modules/license/license.constants"

import { Route as ActivationsRoute } from "~/src/routes/api/cli.v1.activations"
import { Route as ActivationRoute } from "~/src/routes/api/cli.v1.activations.$activationId"
import { Route as BundlesRoute } from "~/src/routes/api/cli.v1.activations.$activationId.bundles"
import { Route as LicenseRoute } from "~/src/routes/api/cli.v1.license"

import { getRouter } from "~/src/router"
import { ROUTES } from "~/src/routes"

vi.mock("collections/server", () => ({ blog: [], docs: { toFumadocsSource: () => ({ files: [] }) } }))

const ACTIVATION_ID = crypto.randomUUID()
const CONTRACT_SEGMENT = `:${ROUTE_PARAMETER.ACTIVATION_ID}`
const FILE_ROUTE_SEGMENT = `$${ROUTE_PARAMETER.ACTIVATION_ID}`

const CONTRACT_ROUTES = [
  { endpoint: API_ENDPOINT.LICENSE, name: "LICENSE", params: {}, route: LicenseRoute },
  { endpoint: API_ENDPOINT.ACTIVATE, name: "ACTIVATE", params: {}, route: ActivationsRoute },
  { endpoint: API_ENDPOINT.VALIDATE, name: "VALIDATE", params: { [ROUTE_PARAMETER.ACTIVATION_ID]: ACTIVATION_ID }, route: ActivationRoute },
  { endpoint: API_ENDPOINT.BUNDLE, name: "BUNDLE", params: { [ROUTE_PARAMETER.ACTIVATION_ID]: ACTIVATION_ID }, route: BundlesRoute },
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

it("serves every endpoint of the contract", () => {
  expect([...LICENSE_API_ENDPOINTS].toSorted()).toStrictEqual(Object.keys(API_ENDPOINT).toSorted())
})

it("answers each contract method with its licence API handler and no other method", () => {
  expect(LicenseRoute.options.server?.handlers).toStrictEqual({ [API_ENDPOINT.LICENSE.method]: licenseApiHandlers.license })
  expect(ActivationsRoute.options.server?.handlers).toStrictEqual({ [API_ENDPOINT.ACTIVATE.method]: licenseApiHandlers.activate })
  expect(ActivationRoute.options.server?.handlers).toStrictEqual({
    [API_ENDPOINT.DEACTIVATE.method]: licenseApiHandlers.deactivate,
    [API_ENDPOINT.VALIDATE.method]: licenseApiHandlers.validate,
  })
  expect(BundlesRoute.options.server?.handlers).toStrictEqual({ [API_ENDPOINT.BUNDLE.method]: licenseApiHandlers.bundle })
})

it("sends the CLI to the licence page this app serves", () => {
  expect(LICENSE_PAGE_PATH).toBe(ROUTES.APP_LICENSE)
})
