import { isNotFound, notFound } from "@tanstack/react-router"

import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"
import { loadPageMetadata } from "~/src/integrations/use-intl/i18n.messages"
import { getCurrentLocale } from "~/src/integrations/use-intl/i18n.utils"

import { ERROR_CODES } from "~/src/modules/_core/constants/errors"

import { ROBOTS, buildPageHead, buildTitle } from "~/src/lib/seo"

const NAMESPACE = "errors.not-found"

export const rethrowAsNotFound = (error: unknown): never => {
  if (error instanceof Error && error.message === ERROR_CODES.NOT_FOUND) {
    throw notFound()
  }

  throw error
}

export const notFoundHead = async (locale: SupportedLocale) => {
  const { description, title } = await loadPageMetadata({ locale, namespace: NAMESPACE })

  return {
    meta: [
      { title: buildTitle({ locale, title }) },
      { content: description, name: "description" },
      { content: ROBOTS.NOINDEX, name: "robots" },
    ],
  }
}

interface RecordLoaderData {
  readonly locale: SupportedLocale
  readonly pathname: string
  readonly title: string
}

interface RecordHeadContext {
  readonly loaderData?: RecordLoaderData | undefined
  readonly match: { readonly error: unknown }
}

export const recordHead =
  (listPathname: string) =>
  ({ loaderData, match }: RecordHeadContext) => {
    if (isNotFound(match.error)) {
      return notFoundHead(getCurrentLocale())
    }

    return buildPageHead({ locale: loaderData?.locale, pathname: loaderData?.pathname ?? listPathname, title: loaderData?.title })
  }
