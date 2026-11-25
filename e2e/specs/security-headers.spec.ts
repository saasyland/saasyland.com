import { readdir } from "node:fs/promises"

import type { APIResponse } from "@playwright/test"

import { HTTP_STATUS, SECURITY_HEADERS } from "../../src/modules/_core/constants/api"
import * as ROUTES from "../../src/routes"
import { expect, test } from "../fixtures/test"

const CLIENT_ASSETS = "dist/client/assets"
const CONTENT_SECURITY_POLICY = "Content-Security-Policy"

const expectSecurityHeaders = (response: APIResponse, label: string): void => {
  const headers = response.headers()
  for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
    if (name === CONTENT_SECURITY_POLICY) {
      expect(headers[name.toLowerCase()], `${label}: ${name}`).toBeTruthy()
    } else {
      expect(headers[name.toLowerCase()], `${label}: ${name}`).toBe(value)
    }
  }
}

test("every response carries X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Cross-Origin-Opener-Policy and Permissions-Policy", async ({
  request,
}) => {
  const [script] = (await readdir(CLIENT_ASSETS)).filter((file) => file.endsWith(".js"))
  const responses = [
    { label: "a prerendered page", response: await request.get("/"), status: HTTP_STATUS.OK },
    { label: "a page rendered on request", response: await request.get(ROUTES.COURSES), status: HTTP_STATUS.OK },
    { label: "a missing page", response: await request.get("/this-page-does-not-exist"), status: HTTP_STATUS.NOT_FOUND },
    { label: "an auth API answer", response: await request.get(`${ROUTES.API_AUTH_BASE}${ROUTES.API_AUTH.GET_SESSION}`), status: HTTP_STATUS.OK },
    { label: "a refused server function", response: await request.post("/_serverFn/refused"), status: HTTP_STATUS.FORBIDDEN },
    { label: "a static file", response: await request.get("/robots.txt"), status: HTTP_STATUS.OK },
    { label: "a hashed script", response: await request.get(`/assets/${script ?? ""}`), status: HTTP_STATUS.OK },
  ]

  for (const { label, response, status } of responses) {
    expect(response.status(), label).toBe(status)
    expectSecurityHeaders(response, label)
  }
})
