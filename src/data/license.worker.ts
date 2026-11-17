import { COUNTRY_HEADER } from "~/src/modules/_core/constants/api"
import { BUNDLE_PATH_PREFIX } from "~/src/modules/license/license.constants"
import {
  PPP_ATTRIBUTE,
  PPP_COOKIE,
  PPP_DECLINED,
  PPP_PERCENT,
  getPppPercentOff,
  pppMultiplierKey,
} from "~/src/modules/license/license.pricing"

import { WORKER_HANDLER_KIND, type WorkerHandler } from "~/src/data/worker.constants"

import { readCookie } from "~/src/lib/cookie"

export const LICENSE_WORKER_HANDLERS = [
  {
    kind: WORKER_HANDLER_KIND.DOCUMENT,
    rewrite: (page, { locale, request }) => {
      const country = request.headers.get(COUNTRY_HEADER)?.toUpperCase()
      const multiplierKey = pppMultiplierKey(country)

      if (country === undefined || multiplierKey === PPP_PERCENT) {
        return page
      }

      const region = new Intl.DisplayNames([locale], { type: "region" }).of(country)
      const percent = new Intl.NumberFormat(locale, { style: "percent" }).format(getPppPercentOff(country) / PPP_PERCENT)
      const declined = readCookie({ header: request.headers.get("Cookie"), name: PPP_COOKIE }) === PPP_DECLINED

      return new HTMLRewriter()
        .on("html", {
          element: (html) => {
            html.setAttribute(PPP_ATTRIBUTE, String(multiplierKey))
            html.setAttribute("style", `--ppp-region:${JSON.stringify(region)};--ppp-percent:${JSON.stringify(percent)}`)
          },
        })
        .on(".ppp-offer input", {
          element: (input) => {
            if (declined) {
              input.removeAttribute("checked")
            }
          },
        })
        .transform(page)
    },
  },
  {
    fetch: async (request) => {
      const { serveBundle } = await import("~/src/modules/license/license.delivery")
      return serveBundle(request)
    },
    kind: WORKER_HANDLER_KIND.REQUEST,
    pathPrefix: `${BUNDLE_PATH_PREFIX}/`,
  },
] as const satisfies readonly WorkerHandler[]
