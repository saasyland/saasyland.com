import { describe, expect, it } from "vite-plus/test"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { NO_BREAK_SPACES, noBreakSpaceProblems } from "~/src/lib/no-break-spaces"

const NO_BREAK_SPACE = "\u00A0"
const NARROW_NO_BREAK_SPACE = "\u202F"

describe("NO_BREAK_SPACES", () => {
  it("names the marks that take a no-break space for every supported locale", () => {
    expect(Object.keys(NO_BREAK_SPACES).toSorted()).toEqual([...I18N.SUPPORTED_LOCALES].toSorted())
  })
})

describe("noBreakSpaceProblems", () => {
  it("finds an ordinary or a narrow space before a French mark and inside French quotation marks", () => {
    expect(
      noBreakSpaceProblems({
        locale: "fr-FR",
        text: `Attention : la page « Licences${NARROW_NO_BREAK_SPACE}» est prête ; vraiment ?`,
      }),
    ).toEqual([
      "puts U+0020 before “;” where fr-FR needs a no-break space, U+00A0",
      "puts U+0020 before “:” where fr-FR needs a no-break space, U+00A0",
      "puts U+0020 before “?” where fr-FR needs a no-break space, U+00A0",
      "puts U+0020 after “«” where fr-FR needs a no-break space, U+00A0",
      "puts U+202F before “»” where fr-FR needs a no-break space, U+00A0",
    ])
  })

  it.each([
    {
      locale: "fr-FR",
      text: `Attention${NO_BREAK_SPACE}: la page «${NO_BREAK_SPACE}Licences${NO_BREAK_SPACE}» est prête${NO_BREAK_SPACE}!`,
    },
    { locale: "fr-FR", text: "Lancez bun run check:i18n, puis ouvrez https://saasyland.com/docs?ref=email." },
    { locale: "uk-UA", text: "Сторінка «Ліцензії» готова: перевірте її !" },
    { locale: "en-US", text: "Ready ? Open « Licences » : it works ; really !" },
  ] as const)("passes $locale text that needs no other space", ({ locale, text }) => {
    expect(noBreakSpaceProblems({ locale, text })).toEqual([])
  })
})
