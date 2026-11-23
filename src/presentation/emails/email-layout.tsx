import type { JSX, ReactNode } from "react"

import { Body, Container, Head, Html, Preview, Tailwind, pixelBasedPreset } from "react-email"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

const TAILWIND_CONFIG = { presets: [pixelBasedPreset] }

export const EMAIL_DATE_TIME_FORMAT = { ...I18N.FORMATS.dateTime.calendarDate, ...I18N.FORMATS.dateTime.time }

interface EmailLayoutProps {
  readonly children: ReactNode
  readonly lang: string
  readonly preview: string
}

export const EmailLayout = ({ children, lang, preview }: EmailLayoutProps): JSX.Element => (
  <Html lang={lang}>
    <Tailwind config={TAILWIND_CONFIG}>
      <Head />
      <Body className="font-sans">
        <Preview>{preview}</Preview>
        <Container className="mx-auto px-5 py-10">{children}</Container>
      </Body>
    </Tailwind>
  </Html>
)
