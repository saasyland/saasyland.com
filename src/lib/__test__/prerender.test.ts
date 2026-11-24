import { expect, it } from "vite-plus/test"

import { shouldPrerender } from "~/src/lib/prerender"

import * as ROUTES from "~/src/routes"

it.each([
  { path: ROUTES.HOME, prerendered: true },
  { path: ROUTES.DOCS, prerendered: true },
  { path: "/pl-PL/docs", prerendered: true },
  { path: ROUTES.API, prerendered: false },
  { path: `/de-DE${ROUTES.API}/search`, prerendered: false },
  { path: `${ROUTES.DOCS}?search=one`, prerendered: false },
  { path: `${ROUTES.HOME}#pricing`, prerendered: false },
  { path: ROUTES.BLOG_FEED, prerendered: false },
  { path: "/uk-UA/blog/rss.xml", prerendered: false },
  { path: `${ROUTES.BLOG}/eu-right-of-withdrawal-digital-products`, prerendered: true },
])("prerenders $path: $prerendered", ({ path, prerendered }) => {
  expect(shouldPrerender({ path })).toBe(prerendered)
})
