import zod from "zod/v4"

import { scriptPolicy } from "~/src/lib/content-security-policy"

const CHARSET = '<meta charSet="utf-8"/>'
const NONCE_META = /<meta property="csp-nonce" content="[^"]*"\/>/gu
const NONCE_ATTRIBUTE = /(?<tag><(?:link|meta|script|style)\b[^>]*?) nonce="[^"]*"/gu
const ENTRY_SCRIPT = /<script type="module" async="" src="(?<src>\/assets\/[^"]+\.js)"><\/script>/gu
const SCRIPT = /<script(?<attributes>[^>]*)>(?<source>[\s\S]*?)<\/script[^>]*>/giu
const SCRIPT_START = /<script/iu
const SCRIPT_TYPE = /\btype="(?<type>[^"]*)"/u
const SCRIPT_SOURCE = /\bsrc=/u
const JAVASCRIPT_TYPES = new Set(["module", "text/javascript"])
const ENTRY_SCRIPTS_PER_PAGE = 1

const scriptSchema = zod.object({ attributes: zod.string(), source: zod.string() })
const typeSchema = zod.object({ type: zod.string() })

interface SecuredPage {
  readonly hashes: number
  readonly html: string
}

const entryLoader = (src: string): string =>
  `<script>{const s=document.createElement("script");s.type="module";s.async=true;s.src=${JSON.stringify(src)};document.currentScript.replaceWith(s)}</script>`

const isExecutable = (attributes: string): boolean => {
  const match = SCRIPT_TYPE.exec(attributes)

  return match === null || JAVASCRIPT_TYPES.has(typeSchema.parse(match.groups).type)
}

const hashSource = async (source: string): Promise<string> => {
  const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(source)))

  return `'sha256-${btoa(String.fromCodePoint(...digest))}'`
}

export const securePrerenderedPage = async (html: string): Promise<SecuredPage> => {
  const page = html.replaceAll(NONCE_META, "").replaceAll(NONCE_ATTRIBUTE, "$<tag>")
  const entries = page.match(ENTRY_SCRIPT) ?? []

  if (entries.length !== ENTRY_SCRIPTS_PER_PAGE) {
    throw new Error(`Expected one entry module script, found ${entries.length}.`)
  }

  const loaded = page.replaceAll(ENTRY_SCRIPT, (_script, src: string) => entryLoader(src))
  const scripts = Array.from(loaded.matchAll(SCRIPT), (match) => scriptSchema.parse(match.groups))

  if (scripts.some(({ attributes }) => SCRIPT_SOURCE.test(attributes))) {
    throw new Error("A script with a src attribute is left, and a hash-based policy would block it.")
  }

  if (!loaded.slice(0, loaded.search(SCRIPT_START)).includes(CHARSET)) {
    throw new Error("The charset meta tag must come before the first script, so the policy can be inserted after it.")
  }

  const hashes = await Promise.all(scripts.filter(({ attributes }) => isExecutable(attributes)).map(({ source }) => hashSource(source)))
  const unique = [...new Set(hashes)]
  const policy = `<meta http-equiv="Content-Security-Policy" content="${scriptPolicy(unique)}"/>`

  return { hashes: unique.length, html: loaded.replace(CHARSET, `${CHARSET}${policy}`) }
}
