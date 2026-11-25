import { render, screen } from "@testing-library/react"
import { IntlProvider } from "use-intl"
import { describe, expect, it } from "vite-plus/test"
import * as zod from "zod"

import { getTestMessages } from "~/src/integrations/use-intl/__test__/fixtures/messages"
import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { LegalNotice } from "~/src/presentation/components/custom/legal-notice"

import englishNotice from "~/messages/en-US/components.custom.legal-notice.json"

const noticeSchema = zod.object({ body: zod.string(), title: zod.string() })

const customSchema = zod.object({ "legal-notice": noticeSchema })

const noticeMessagesSchema = zod.object({ components: zod.object({ custom: customSchema }) })

describe("LegalNotice", () => {
  it("warns that the page describes an implementation and is not legal advice", () => {
    render(
      <IntlProvider locale={I18N.DEFAULT_LOCALE} messages={getTestMessages(I18N.DEFAULT_LOCALE)} timeZone="UTC">
        <LegalNotice />
      </IntlProvider>,
    )

    expect(screen.getByText(englishNotice.title)).toBeInTheDocument()
    expect(screen.getByText(englishNotice.body)).toBeInTheDocument()
  })

  it.each(I18N.SUPPORTED_LOCALES)("prints the one shared wording in %s", (locale) => {
    const messages = getTestMessages(locale)
    const notice = noticeMessagesSchema.parse(messages).components.custom["legal-notice"]

    render(
      <IntlProvider locale={locale} messages={messages} timeZone="UTC">
        <LegalNotice />
      </IntlProvider>,
    )

    expect(screen.getByText(notice.title)).toBeInTheDocument()
    expect(screen.getByText(notice.body)).toBeInTheDocument()
  })
})
