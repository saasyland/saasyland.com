import type { ReactElement } from "react"

import { Renderer } from "@takumi-rs/core"
import { fromJsx } from "@takumi-rs/helpers/jsx"
import { readFile } from "node:fs/promises"

import { loadFontFaces } from "~/src/integrations/takumi/takumi.fonts"
import { I18N, type SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

import { SOCIAL_IMAGE } from "~/src/lib/seo"

import { PageCard, SiteCard } from "~/src/presentation/social-card"

const STYLESHEET = "src/presentation/styles/globals.css"

interface PageCardInput {
  readonly lang: SupportedLocale
  readonly section?: string | undefined
  readonly title: string
}

export const createSocialCardRenderer = async () => {
  const renderer = new Renderer()
  const [stylesheet, fonts] = await Promise.all([readFile(STYLESHEET, "utf8"), loadFontFaces()])

  const render = async (card: ReactElement, lang: SupportedLocale): Promise<Buffer> => {
    const { css, node } = await fromJsx(card)

    return renderer.render(node, {
      css: [stylesheet, ...css],
      fonts,
      format: SOCIAL_IMAGE.FORMAT,
      height: SOCIAL_IMAGE.HEIGHT,
      lang,
      width: SOCIAL_IMAGE.WIDTH,
    })
  }

  return {
    page: ({ lang, section, title }: PageCardInput) => render(<PageCard section={section} title={title} />, lang),
    site: () => render(<SiteCard />, I18N.DEFAULT_LOCALE),
  }
}
