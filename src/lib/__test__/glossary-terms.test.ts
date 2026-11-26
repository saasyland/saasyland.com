import { describe, expect, it } from "vite-plus/test"

import { POLISH_NAMES, POLISH_PHRASES, POLISH_TERMS } from "~/src/data/polish-glossary"

import { CHECKED_TERMS, CONTEXT_TERMS, STEM_MARK, glossaryMatches, neverTermText } from "~/src/lib/glossary-terms"

const GLOSSARY = [...POLISH_TERMS, ...POLISH_NAMES, ...POLISH_PHRASES]

const found = (text: string): string[] => glossaryMatches(text).map(({ word }) => word)

describe("neverTermText", () => {
  it("drops the mark where an inflected ending starts", () => {
    expect(neverTermText("przestrze|ń robocz|a")).toBe("przestrzeń robocza")
    expect(neverTermText("repo")).toBe("repo")
  })
})

describe("the glossary's never column", () => {
  it("marks at most one ending in a word, after a stem", () => {
    const words = GLOSSARY.flatMap((row) => row[2].flatMap((term) => term.split(" ")))

    expect(words.filter((word) => word.split(STEM_MARK).length > 2 || word.startsWith(STEM_MARK))).toEqual([])
  })

  it("never fails a term the glossary prefers", () => {
    expect(GLOSSARY.flatMap(([, preferred]) => preferred.flatMap((term) => found(term)))).toEqual([])
  })

  it("leaves a word that is right in another meaning to the reader", () => {
    expect(CONTEXT_TERMS).toEqual(expect.arrayContaining(["karta", "zakładka", "poziom", "rachunek", "maszyna", "wysłać"]))
    expect(CHECKED_TERMS.map(({ never }) => never)).not.toContain("poziom")
  })
})

describe("glossaryMatches", () => {
  it.each([
    { text: "Wspierane wersje", words: ["Wspierane"] },
    { text: "Lista wspieranej wersji Node.js.", words: ["wspieranej"] },
    { text: "Wspieramy PostgreSQL i nie wspiera MySQL.", words: ["Wspieramy", "wspiera"] },
    { text: "Osobny, a nie dedykowanego serwera.", words: ["dedykowanego"] },
    { text: "Ustawienia przestrzeni roboczej", words: ["przestrzeni roboczej"] },
    { text: "Otwórz go w panelu admina.", words: ["panelu admina"] },
    { text: "Działa na edge’u i na edge'u, a edge'owy cache też.", words: ["na edge’u", "na edge'u", "edge'owy"] },
    { text: "Kolumny dashboardu", words: ["dashboardu"] },
    { text: "Wyślij magiczny\nlink.", words: ["magiczny\nlink"] },
    { text: "Patch trafia do patches/.", words: ["Patch"] },
    { text: "Nowa funkcjonalność.\n\nDubler testowy.", words: ["funkcjonalność", "Dubler"] },
    { text: "- Placeholdery tekstu\n| Magiczne linki |", words: ["Placeholdery", "Magiczne linki"] },
    { text: "Raport z bramką pokrycia.", words: ["bramką pokrycia"] },
    { text: "Kod w React z TanStack Start, w Git i na Vercel.", words: ["w React", "w Git", "na Vercel"] },
    { text: "Wygenerowano w pakiecie Agency.", words: ["pakiecie Agency"] },
  ])("finds $words in “$text”", ({ text, words }) => {
    expect(found(text)).toEqual(words)
  })

  it.each([
    "Wsparcie techniczne odpowiada w ciągu dnia.",
    "Panel administracyjny w /admin/users i e-mail do administratora.",
    "Auth.js i Better Auth to biblioteki, a Stripe Billing i Clerk Dashboard to produkty.",
    "{billingGeneration} i komitet sterujący",
    "Lokalny serwer, repozytorium i stosowanie zasad.",
    "Płatność w Polarze, w Reakcie i na GitHubie.",
    "Tag i\nRelease opisują pakiet.",
    "Plan Starter jest darmowy, a poziom kursu i karta w przeglądarce zostają.",
  ])("leaves “%s” alone", (text) => {
    expect(found(text)).toEqual([])
  })

  it("names the term, its meaning and the terms the glossary prefers", () => {
    const [match] = glossaryMatches("Nie wspiera.")

    expect(match?.index).toBe(4)
    expect(match?.word).toBe("wspiera")
    expect(match?.term.meaning).toBe("support (a format, a provider)")
    expect(match?.term.never).toBe("wspierać")
    expect(match?.term.preferred).toEqual(["obsługiwać"])
  })
})
