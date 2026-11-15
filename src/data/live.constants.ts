export const CONTENT_TYPE = {
  HTML: "text/html",
  JSON: "application/json",
  PLAIN_TEXT: "text/plain",
  XML: "application/xml",
} as const

export interface LiveSiteCheck {
  readonly contentType: string
  readonly path: string
  readonly status: number
}
