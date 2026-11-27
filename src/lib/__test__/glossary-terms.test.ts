import { describe, expect, it } from "vite-plus/test"

import {
  GERMAN_GLOSSARY,
  GLOSSARIES,
  type Glossary,
  POLISH_GLOSSARY,
  STEM_MARK,
  glossaryMatches,
  neverTermText,
} from "~/src/lib/glossary-terms"

const wordsIn =
  (glossary: Glossary) =>
  (text: string): string[] =>
    glossaryMatches(glossary, text).map(({ word }) => word)

const found = wordsIn(POLISH_GLOSSARY)

const foundInGerman = wordsIn(GERMAN_GLOSSARY)

describe("neverTermText", () => {
  it("drops the mark where an inflected ending starts", () => {
    expect(neverTermText("przestrze|ń robocz|a")).toBe("przestrzeń robocza")
    expect(neverTermText("repo")).toBe("repo")
  })
})

describe.each(GLOSSARIES)("the $language glossary's never column", (glossary) => {
  it("marks at most one ending in a word, after a stem", () => {
    const words = glossary.rows.flatMap((row) => row[2].flatMap((term) => term.split(" ")))

    expect(words.filter((word) => word.split(STEM_MARK).length > 2 || word.startsWith(STEM_MARK))).toEqual([])
  })

  it("never fails a term the glossary prefers", () => {
    expect(glossary.rows.flatMap(([, preferred]) => preferred.flatMap((term) => wordsIn(glossary)(term)))).toEqual([])
  })
})

describe("a word that is right in another meaning", () => {
  it("is left to the reader", () => {
    expect(POLISH_GLOSSARY.contextTerms).toEqual(
      expect.arrayContaining(["karta", "zakładka", "poziom", "rachunek", "maszyna", "wysłać", "haczyk", "gniazdo"]),
    )
    expect(POLISH_GLOSSARY.checkedTerms.map(({ never }) => never)).not.toContain("poziom")
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
    { text: "Komunikaty do wszystkich idą przez socket, w realtime.", words: ["Komunikaty do wszystkich", "socket", "realtime"] },
    { text: "Rewokacja dostępu zbanowanego konta w Prisma.", words: ["Rewokacja", "zbanowanego", "w Prisma"] },
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
    "Jest jednak haczyk: gniazdo TCP to nie WebSocket, a bank to nie blokada konta w Prismie.",
  ])("leaves “%s” alone", (text) => {
    expect(found(text)).toEqual([])
  })

  it("names the term, its meaning and the terms the glossary prefers", () => {
    const [match] = glossaryMatches(POLISH_GLOSSARY, "Nie wspiera.")

    expect(match?.index).toBe(4)
    expect(match?.word).toBe("wspiera")
    expect(match?.term.meaning).toBe("support (a format, a provider)")
    expect(match?.term.never).toBe("wspierać")
    expect(match?.term.preferred).toEqual(["obsługiwać"])
  })
})

describe("glossaryMatches in German", () => {
  it.each([
    { text: "Öffne das Armaturenbrett.", words: ["Armaturenbrett"] },
    { text: "Jede Stufe und alle Stufenkarten.", words: ["Stufe", "Stufenkarten"] },
    { text: "Die Admin-Konsole zeigt jeden Pull Request.", words: ["Admin-Konsole", "Pull Request"] },
    { text: "Die Ratenbegrenzung des CLI.", words: ["Ratenbegrenzung", "des CLI"] },
    { text: "Das macht Sinn.", words: ["macht Sinn"] },
  ])("finds $words in “$text”", ({ text, words }) => {
    expect(foundInGerman(text)).toEqual(words)
  })

  it.each([
    "Das Dashboard im Adminbereich und jeder Pull-Request.",
    "Ein Bun-Workspace mit zwei Workspaces und Graustufen.",
    "Die CLI aus dem Paket Complete ergibt Sinn.",
  ])("leaves “%s” alone", (text) => {
    expect(foundInGerman(text)).toEqual([])
  })
})
