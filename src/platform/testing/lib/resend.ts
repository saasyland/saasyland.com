import { vi } from "vite-plus/test"

import { resendApi } from "~/src/platform/testing/mocks/resend"

import { HTTP_STATUS } from "~/src/modules/_core/constants/api"

export const failNextResendDelivery = (): void => {
  const providerFetch = globalThis.fetch
  let isResendDown = true
  vi.spyOn(globalThis, "fetch").mockImplementation((input, init) => {
    const request = new Request(input, init)
    if (isResendDown && new URL(request.url).origin === resendApi.origin) {
      isResendDown = false
      return Promise.resolve(
        Response.json(
          { message: "Provider temporarily unavailable", name: "application_error", statusCode: HTTP_STATUS.SERVICE_UNAVAILABLE },
          { status: HTTP_STATUS.SERVICE_UNAVAILABLE },
        ),
      )
    }
    return providerFetch(request)
  })
}
