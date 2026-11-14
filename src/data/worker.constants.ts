import type { SupportedLocale } from "~/src/integrations/use-intl/i18n.config"

export const WORKER_HANDLER_KIND = {
  DOCUMENT: "document",
  REQUEST: "request",
} as const

interface DocumentContext {
  readonly locale: SupportedLocale
  readonly request: Request
}

interface DocumentHandler {
  readonly kind: typeof WORKER_HANDLER_KIND.DOCUMENT
  readonly rewrite: (document: Response, context: DocumentContext) => Response
}

interface RequestHandler {
  readonly fetch: (request: Request) => Promise<Response>
  readonly kind: typeof WORKER_HANDLER_KIND.REQUEST
  readonly pathPrefix: string
}

export type WorkerHandler = DocumentHandler | RequestHandler
