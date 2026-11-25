import { expect, it } from "vite-plus/test"

import { shouldPrerender } from "~/src/lib/prerender"

import { ROUTES } from "~/src/routes"

it.each([
  { path: ROUTES.HOME, prerendered: true },
  { path: ROUTES.DOCS.INDEX, prerendered: true },
  { path: "/pl-PL/docs", prerendered: true },
  { path: ROUTES.API.INDEX, prerendered: false },
  { path: `/de-DE${ROUTES.API.INDEX}/search`, prerendered: false },
  { path: `${ROUTES.DOCS.INDEX}?search=one`, prerendered: false },
  { path: `${ROUTES.HOME}#pricing`, prerendered: false },
  { path: ROUTES.BLOG.FEED, prerendered: false },
  { path: "/uk-UA/blog/rss.xml", prerendered: false },
  { path: `${ROUTES.BLOG.INDEX}/eu-right-of-withdrawal-digital-products`, prerendered: true },
])("prerenders $path: $prerendered", ({ path, prerendered }) => {
  expect(shouldPrerender({ path })).toBe(prerendered)
})
