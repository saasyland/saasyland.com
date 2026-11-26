import { parse } from "@formatjs/icu-messageformat-parser"
import { describe, expect, it } from "vite-plus/test"

import {
  courseFileProblems,
  formatCopyProblem,
  literalTextOf,
  mdxFileProblems,
  messageFileProblems,
  metaFileProblems,
  readableProse,
} from "~/src/lib/glossary-copy"
import { GERMAN_GLOSSARY, POLISH_GLOSSARY } from "~/src/lib/glossary-terms"

const words = (problems: readonly { line: number; word: string }[]): string[] => problems.map(({ line, word }) => `${String(line)}:${word}`)

describe("literalTextOf", () => {
  it("keeps the words of every branch and tag and drops the arguments", () => {
    expect(
      literalTextOf(
        parse("Masz {count, plural, one {# patch} other {# patche}} w <b>{name} dashboard</b>, {kind, select, a {tak} other {nie}}"),
      ),
    ).toBe("Masz   patch   patche w   dashboard, tak nie")
  })
})

describe("readableProse", () => {
  it("blanks what is not Polish prose and keeps every line in place", () => {
    const source = [
      "```ts",
      "const patch = 1",
      "```",
      'import { X } from "x"',
      "Uruchom `bun patch` i [dashboard](/docs/dashboard) z {billingGeneration, select, other {patche}}.",
      "## Wdrożenie [#deploy]",
      "[magiczny link]: https://example.com/magic-link",
      "Zobacz https://example.com/dashboard, „the first stable release”, “helper” i »merge«.",
      'Kolejka scalania (ang. merge queue) i <Callout type="patch" title="Nowy dashboard">patch</Callout>.',
    ].join("\n")
    const prose = readableProse(POLISH_GLOSSARY, source)

    expect(prose).toHaveLength(source.length)
    expect(prose.split("\n")).toHaveLength(source.split("\n").length)
    expect(prose.match(/\p{L}+/gu)).toEqual([
      "Uruchom",
      "i",
      "dashboard",
      "z",
      "select",
      "other",
      "patche",
      "Wdrożenie",
      "Zobacz",
      "i",
      "Kolejka",
      "scalania",
      "i",
      "Nowy",
      "dashboard",
      "patch",
    ])
  })
})

describe("messageFileProblems", () => {
  it("reads every message as rendered text, on its own line", () => {
    const source = JSON.stringify(
      { page: { cta: 'Otwórz "pulpit"', nested: { body: "Twój {dashboard} i <b>dashboard</b>" }, title: "Wspierane wersje" } },
      undefined,
      2,
    )

    expect(words(messageFileProblems(POLISH_GLOSSARY, source))).toEqual(["5:dashboard", "7:Wspierane"])
  })
})

describe("courseFileProblems", () => {
  it("reads only the Polish text of a course file", () => {
    const source = JSON.stringify(
      { courses: [{ summary: { "en-US": "Checkout", "pl-PL": "Checkout i webhooki" }, title: { "pl-PL": "Bez `checkout`" } }] },
      undefined,
      2,
    )

    expect(words(courseFileProblems(POLISH_GLOSSARY, source))).toEqual(["6:Checkout"])
  })
})

describe("metaFileProblems", () => {
  it("reads the title of a navigation file and not its page slugs", () => {
    const source = JSON.stringify({ pages: ["dashboard", "patch"], title: "Dashboard" }, undefined, 2)

    expect(words(metaFileProblems(POLISH_GLOSSARY, source))).toEqual(["6:Dashboard"])
  })
})

describe("mdxFileProblems", () => {
  it("reads the prose fields of the frontmatter and the body, each on its own line", () => {
    const source = [
      "---",
      'title: "Dashboard bez patcha"',
      "description: Nowy dashboard",
      "tags:",
      "  - release",
      "faq:",
      "  - question: Czy działa?",
      "    answer: >-",
      "      Tak, a",
      "      Patch też.",
      "---",
      "",
      "Treść z helperem.",
    ].join("\n")

    expect(words(mdxFileProblems(POLISH_GLOSSARY, source))).toEqual(["2:Dashboard", "2:patcha", "3:dashboard", "13:helperem"])
  })

  it("reads a changelog entry, which has no frontmatter", () => {
    expect(words(mdxFileProblems(POLISH_GLOSSARY, "- Dodano: dashboard.\n- Naprawiono: patch."))).toEqual(["1:dashboard", "2:patch"])
  })
})

describe("formatCopyProblem", () => {
  it("prints the file, the line, the word, the term and what to write instead", () => {
    const [problem] = messageFileProblems(POLISH_GLOSSARY, '{\n  "title": "Wspierane wersje"\n}')

    expect(problem && formatCopyProblem(POLISH_GLOSSARY, "messages/pl-PL/pages.docs.json", problem)).toBe(
      "messages/pl-PL/pages.docs.json:2: „Wspierane” is „wspierać”, which Polish copy never writes for “support (a format, a provider)”; write „obsługiwać”",
    )
  })
})

describe("German copy", () => {
  it("skips German quotations and an English term after engl.", () => {
    const source = "Schreib nie „Armaturenbrett“ oder ‚Stufe‘, sondern Dashboard (engl. Seat) und das Armaturenbrett."

    expect(words(mdxFileProblems(GERMAN_GLOSSARY, source))).toEqual(["1:Armaturenbrett"])
  })

  it("reads only the German text of a course file", () => {
    const source = JSON.stringify({ title: { "de-DE": "Jede Stufe", "pl-PL": "Każda Stufe" } }, undefined, 2)

    expect(words(courseFileProblems(GERMAN_GLOSSARY, source))).toEqual(["3:Stufe"])
  })

  it("names German copy in the problem", () => {
    const [problem] = messageFileProblems(GERMAN_GLOSSARY, '{\n  "title": "Jede Stufe"\n}')

    expect(problem && formatCopyProblem(GERMAN_GLOSSARY, "messages/de-DE/pages.landing.json", problem)).toBe(
      "messages/de-DE/pages.landing.json:2: „Stufe” is „Stufe”, which German copy never writes for “tier”; write „Paket” or „Pakete” or „das Paket Complete”",
    )
  })
})
