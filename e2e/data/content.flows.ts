import { FLOW_AREA, FLOW_STATUS, type Flow } from "./flows"

export const CONTENT_FLOWS = [
  {
    area: FLOW_AREA.CONTENT,
    id: "docs-navigation",
    outcome: "The docs follow a sidebar link through the router before the page's MDX has loaded and render the next page",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "content.spec.ts", title: "documentation loads MDX and follows a sidebar link through the router before the page's MDX has loaded" }],
  },
  {
    area: FLOW_AREA.CONTENT,
    id: "docs-search",
    outcome: "The docs search downloads the static index of the page's language and finds pages in it",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "content.spec.ts", title: "content without the Worker › the en-US docs search downloads its own static index and finds pages in it" },
      { spec: "content.spec.ts", title: "content without the Worker › the pl-PL docs search downloads its own static index and finds pages in it" },
    ],
  },
  {
    area: FLOW_AREA.CONTENT,
    id: "blog-article",
    outcome: "A visitor opens a published article from the blog without a browser error",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "content.spec.ts", title: "blog opens a published article without browser errors" }],
  },
  {
    area: FLOW_AREA.CONTENT,
    id: "blog-share",
    outcome: "A post shares its canonical address on every network and by copying it, with and without JavaScript, and links each section to itself",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "blog-share.spec.ts",
        title: "shares the post's canonical URL on every network from under the title and from the end of the article",
      },
      { spec: "blog-share.spec.ts", title: "copies the canonical URL and confirms it on screen" },
      { spec: "blog-share.spec.ts", title: "shares by link without JavaScript" },
      { spec: "blog-share.spec.ts", title: "links every section of the post to itself" },
    ],
  },
  {
    area: FLOW_AREA.CONTENT,
    id: "blog-feeds",
    outcome: "Each language's blog names its own feed, and the feed lists exactly the published posts of that language with their dates",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "seo.spec.ts", title: "/blog names the blog feed of its own language" },
      { spec: "seo.spec.ts", title: "/ja-JP/blog names the blog feed of its own language" },
      { spec: "seo.spec.ts", title: "every blog feed lists exactly the published posts of its language with their publication dates" },
    ],
  },
  {
    area: FLOW_AREA.CONTENT,
    id: "content-without-worker",
    outcome: "Client navigation through the docs and the blog requests nothing but static files",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "content.spec.ts", title: "content without the Worker › client navigations through the docs and the blog request nothing but static files" }],
  },
  {
    area: FLOW_AREA.CONTENT,
    id: "docs-theme",
    outcome: "The theme chosen in the docs applies at once and survives a reload",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "theme.spec.ts", title: "documentation theme selector changes and persists the selected theme" }],
  },
  {
    area: FLOW_AREA.I18N,
    id: "docs-keep-locale",
    outcome: "The docs and the blog keep the visitor's language through client navigation",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "content.spec.ts", title: "Polish documentation retains its locale during navigation" },
      { spec: "locales.spec.ts", title: "pl-PL: localized docs and blog retain their language after navigation" },
    ],
  },
] as const satisfies readonly Flow[]
