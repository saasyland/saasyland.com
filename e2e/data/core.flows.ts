import { FLOW_FEATURE, FLOW_STATUS, type Flow } from "./flows"

export const CORE_FLOWS = [
  {
    feature: FLOW_FEATURE.CONTENT,
    id: "landing-page",
    outcome: "The landing page renders its hero, navigation and call to action, and Pricing leads to sign-up without reloading the document",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "landing.spec.ts", title: "landing page › renders hero, navigation, and primary CTA" },
      { spec: "landing.spec.ts", title: "server rendering and client navigation › pricing navigates to sign-up without reloading the document" },
    ],
  },
  {
    feature: FLOW_FEATURE.CONTENT,
    id: "cli-configurator",
    outcome: "The configurator's command, output and clipboard follow every answer, and options not generated yet stay disabled and say why",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "cli-configurator.spec.ts", title: "the command, the output and the clipboard follow every answer" },
      {
        spec: "cli-configurator.spec.ts",
        title: "pressing an option the templates do not generate yet changes nothing, and every reader hears it is disabled and why",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.CONTENT,
    id: "install-command",
    outcome: "The hero's install command follows the chosen package manager",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "landing-controls.spec.ts", title: "hero install command follows the selected package manager" }],
  },
  {
    feature: FLOW_FEATURE.CONTENT,
    id: "site-header",
    outcome: "Every public page has the same header links in the same place, marks the current section and keeps one header, unmoved, through client navigation",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "navigation.spec.ts", title: "one site header › lists the same links in the same order on every public page" },
      { spec: "navigation.spec.ts", title: "one site header › marks Docs as the current section on /docs/conventions/components" },
      {
        spec: "navigation.spec.ts",
        title: "one site header › keeps the same header element through client navigations from the landing page to the docs and back",
      },
      {
        spec: "navigation.spec.ts",
        title:
          "one site header › keeps the header in one place in every frame of the client navigations from the landing page to the docs and on to the blog",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.CONTENT,
    id: "accessible-pages",
    outcome: "The public pages and both workspaces meet WCAG 2.2 AA in the light and dark themes",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "accessibility.spec.ts", title: "/ meets WCAG 2.2 AA in the light theme" },
      { spec: "accessibility.spec.ts", title: "/ meets WCAG 2.2 AA in the dark theme" },
      { spec: "workspaces.spec.ts", title: "admin workspace pages meet WCAG 2.2 AA in the light theme" },
      { spec: "workspaces.spec.ts", title: "customer workspace pages meet WCAG 2.2 AA in the dark theme" },
    ],
  },
  {
    feature: FLOW_FEATURE.CONTENT,
    id: "not-found",
    outcome: "A missing page answers 404 with the titled not-found page under the site header, also after a client navigation",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "not-found.spec.ts", title: "/this-page-does-not-exist answers 404 with the one titled not-found page under the site header" },
      { spec: "not-found.spec.ts", title: "/pl-PL/this-page-does-not-exist answers 404 with the one titled not-found page under the site header" },
      { spec: "not-found.spec.ts", title: "navigating to a missing page in the browser shows the same page and title" },
    ],
  },
  {
    feature: FLOW_FEATURE.CONTENT,
    id: "sitemap",
    outcome:
      "The sitemap index names the pages' sitemap and every sitemap a feature serves, the pages' sitemap lists every indexable prerendered page, and every address in them answers 200 without a redirect",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "seo.spec.ts", title: "the sitemap index names the pages' sitemap first and every sitemap it names answers as XML" },
      { spec: "seo.spec.ts", title: "the sitemap lists every prerendered page that allows indexing and nothing else" },
      { spec: "seo.spec.ts", title: "every sitemap URL answers 200 on the built site without a redirect" },
    ],
  },
  {
    feature: FLOW_FEATURE.CONTENT,
    id: "social-cards",
    outcome: "Each page names a social image in its own language that the site serves",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "seo.spec.ts", title: "/ names a social image in its own language that the site serves" },
      { spec: "seo.spec.ts", title: "/ja-JP names a social image in its own language that the site serves" },
    ],
  },
  {
    feature: FLOW_FEATURE.CONTENT,
    id: "stale-build",
    outcome: "A tab opened before a deploy lands on the page the visitor clicks, even when the deploy removed that page's code",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "stale-build.spec.ts", title: "a tab opened before a deploy › lands on the page a visitor clicks when the deploy removed that page's code" },
      { spec: "stale-build.spec.ts", title: "a tab opened before a deploy › lands on the page after a hover failed to preload the removed code" },
    ],
  },
  {
    feature: FLOW_FEATURE.I18N,
    id: "locale-routing",
    outcome: "A short or prefixed locale address opens the page in that language with its lang attribute and hreflang alternates",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "locales.spec.ts", title: "pl-PL: canonical language, mobile layout, and all legal documents" },
      { spec: "landing.spec.ts", title: "landing page › prefixed locale route renders localized landing page" },
    ],
  },
  {
    feature: FLOW_FEATURE.I18N,
    id: "language-switcher",
    outcome: "Choosing a language in the footer's switcher opens the same page in that language",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "locales.spec.ts", title: "choosing a language in the footer's switcher opens the same page in that language" }],
  },
  {
    feature: FLOW_FEATURE.SECURITY,
    id: "content-security-policy",
    outcome:
      "Every HTML response gets a new nonce in its policy and on each of its scripts, frames only Polar's checkout, and no page of any spec breaks the policy",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "content-security-policy.spec.ts", title: "content security policy › / gets a new nonce with every response, in its header and on every script" },
      {
        spec: "content-security-policy.spec.ts",
        title: "content security policy › /auth/sign-in gets a new nonce with every response, in its header and on every script",
      },
      { spec: "content-security-policy.spec.ts", title: "content security policy › the admin console runs under its policy" },
      {
        spec: "content-security-policy.spec.ts",
        title: "content security policy › a customer pays in Polar's checkout over the workspace under its policy, which frames only Polar's checkout",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.SECURITY,
    id: "edge-scripts",
    outcome: "A script the edge adds with the response's nonce runs, and one without it is blocked",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "edge-scripts.spec.ts",
        title: "on /, a script the edge adds with the header's nonce runs, and one without the nonce is blocked",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.SECURITY,
    id: "security-headers",
    outcome: "Every response carries X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Cross-Origin-Opener-Policy and Permissions-Policy",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "security-headers.spec.ts",
        title: "every response carries X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Cross-Origin-Opener-Policy and Permissions-Policy",
      },
    ],
  },
  {
    feature: FLOW_FEATURE.SECURITY,
    id: "hsts",
    outcome: "Every response over HTTPS carries Strict-Transport-Security",
    reason: "The browser suite reaches the local Worker over HTTP only; the unit tests of src/server.ts check HSTS on HTTPS requests.",
    status: FLOW_STATUS.MISSING,
  },
] as const satisfies readonly Flow[]
