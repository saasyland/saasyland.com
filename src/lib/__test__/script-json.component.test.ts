import { runInNewContext } from "node:vm"
import { describe, expect, it } from "vite-plus/test"

import { toScriptJson } from "~/src/lib/script-json"

const HOSTILE_VALUES = [
  "</script><script>globalThis.injected = true</script>",
  "<!--<script>",
  "]]>&amp;<img src=x onerror=alert(1)>",
  "\u2028globalThis.injected = true\u2029",
  { "</script>": ["<", ">", "&", "\u2028", "\u2029"] },
]

describe("toScriptJson", () => {
  it.each(HOSTILE_VALUES)("leaves no character of %j that can end a script element or a line", (value) => {
    expect(toScriptJson(value)).not.toMatch(/[<>&\u2028\u2029]/u)
  })

  it.each(HOSTILE_VALUES)("parses %j back to the same value as JSON", (value) => {
    expect(JSON.parse(toScriptJson(value))).toStrictEqual(value)
  })

  it.each(HOSTILE_VALUES)("keeps %j inside the one script element it is written into", (value) => {
    const code = `globalThis.value = ${toScriptJson(value)}`
    const page = new DOMParser().parseFromString(`<script>${code}</script><p></p>`, "text/html")

    expect(Array.from(page.scripts, (script) => script.text)).toStrictEqual([code])
  })

  it.each(HOSTILE_VALUES)("evaluates %j as one JavaScript literal of the same value", (value) => {
    const context = { injected: false, value: undefined }
    runInNewContext(`globalThis.value = ${toScriptJson(value)}`, context)

    expect(JSON.stringify(context)).toBe(JSON.stringify({ injected: false, value }))
  })

  it("writes each unsafe character as its JSON unicode escape", () => {
    expect(toScriptJson("<>&\u2028\u2029")).toBe(String.raw`"\u003c\u003e\u0026\u2028\u2029"`)
  })
})
