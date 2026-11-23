export const CONTENT_TYPE = {
  HTML: "text/html",
  JSON: "application/json",
  PLAIN_TEXT: "text/plain",
  XML: "application/xml",
} as const

export interface LiveSitePost {
  readonly body: Readonly<Record<string, string>>
  readonly findProblems: (answer: unknown, origin: string) => readonly string[]
  readonly name: string
}

export interface LiveSiteCheck {
  readonly contentType: string
  readonly path: string
  readonly post?: LiveSitePost
}
