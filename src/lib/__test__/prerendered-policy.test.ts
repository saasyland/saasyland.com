import { createHash } from "node:crypto"
import { describe, expect, it } from "vite-plus/test"

import { scriptPolicy } from "~/src/lib/content-security-policy"
import { securePrerenderedPage } from "~/src/lib/prerendered-policy"

const ENTRY = "/assets/index-Entry.js"
const NONCE = "baked0123456789abcdef0123456789"
const CHARSET = '<meta charSet="utf-8"/>'
const THEME = "(function(){document.documentElement.classList.add('dark')})()"
const STATE = "self.$_TSR={buffer:[]}"
const END = "$_TSR.e();document.currentScript.remove()"
const LOADER = `{const s=document.createElement("script");s.type="module";s.async=true;s.src="${ENTRY}";document.currentScript.replaceWith(s)}`
const STRUCTURED_DATA = '{"@type":"Article"}'

const sha256 = (source: string): string => `'sha256-${createHash("sha256").update(source).digest("base64")}'`

const prerendered = ({
  body = `<script nonce="${NONCE}" type="application/ld+json">${STRUCTURED_DATA}</script><script data-tsr-stream-part="" nonce="${NONCE}">${STATE}</script><script type="module" async="" src="${ENTRY}" nonce="${NONCE}"></script><script nonce="${NONCE}">${END}</script>`,
  head = `${CHARSET}<script nonce="${NONCE}">${THEME}</script><meta property="csp-nonce" content="${NONCE}"/><link rel="modulepreload" href="${ENTRY}" fetchpriority="low" nonce="${NONCE}"/><meta name="description" content="A page" nonce="${NONCE}"/>`,
} = {}): string => `<!DOCTYPE html><html lang="en-US"><head>${head}</head><body><main>Page</main>${body}</body></html>`

describe("securePrerenderedPage", () => {
  it("puts a policy with the hash of every inline script right after the charset", async () => {
    const { hashes, html } = await securePrerenderedPage(prerendered())

    expect(hashes).toBe(4)
    expect(html).toContain(
      `${CHARSET}<meta http-equiv="Content-Security-Policy" content="${scriptPolicy([sha256(THEME), sha256(STATE), sha256(LOADER), sha256(END)])}"/><script>${THEME}</script>`,
    )
  })

  it("loads the entry module from a hashed inline script and keeps its low-priority preload", async () => {
    const { html } = await securePrerenderedPage(prerendered())

    expect(html).toContain(`<script>${LOADER}</script><script>${END}</script>`)
    expect(html).toContain(`<link rel="modulepreload" href="${ENTRY}" fetchpriority="low"/>`)
    expect(html).not.toContain('<script type="module"')
  })

  it("removes the nonces that prerendering through the Worker left, since the page has no header to match them", async () => {
    const { html } = await securePrerenderedPage(prerendered())

    expect(html).not.toContain("nonce")
    expect(html).toContain('<meta name="description" content="A page"/>')
  })

  it("leaves structured data unhashed, because browsers never run it", async () => {
    const { html } = await securePrerenderedPage(prerendered())

    expect(html).toContain(`<script type="application/ld+json">${STRUCTURED_DATA}</script>`)
    expect(html).not.toContain(sha256(STRUCTURED_DATA))
  })

  it("hashes a script repeated on the page once, and a script typed as JavaScript like an untyped one", async () => {
    const { hashes, html } = await securePrerenderedPage(
      prerendered({
        body: `<script type="text/javascript">${END}</script><script type="module" async="" src="${ENTRY}"></script><script>${END}</script>`,
      }),
    )

    expect(hashes).toBe(3)
    expect(html).toContain(scriptPolicy([sha256(THEME), sha256(END), sha256(LOADER)]))
  })

  it.each([
    { body: "", count: 0 },
    {
      body: `<script type="module" async="" src="${ENTRY}"></script><script type="module" async="" src="${ENTRY}"></script>`,
      count: 2,
    },
  ])("fails when the page has $count entry module scripts instead of one", async ({ body, count }) => {
    await expect(securePrerenderedPage(prerendered({ body }))).rejects.toThrow(`Expected one entry module script, found ${String(count)}.`)
  })

  it("fails when a script with a src attribute is left, because the policy would block it", async () => {
    await expect(
      securePrerenderedPage(
        prerendered({ body: `<script src="/vendor.js"></script><script type="module" async="" src="${ENTRY}"></script>` }),
      ),
    ).rejects.toThrow("A script with a src attribute is left")
  })

  it.each([
    { head: `<script>${THEME}</script>`, reason: "has no charset meta tag" },
    { head: `<script>${THEME}</script>${CHARSET}`, reason: "runs a script before the charset meta tag" },
  ])("fails when the page $reason", async ({ head }) => {
    await expect(securePrerenderedPage(prerendered({ head }))).rejects.toThrow("The charset meta tag must come before the first script")
  })
})
