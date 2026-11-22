interface SessionDevice {
  readonly browser: string | undefined
  readonly isMobile: boolean
  readonly os: string | undefined
}

const MOBILE_USER_AGENT_PATTERN = /mobile|iphone|android|ipad|ipod/iu

const BROWSERS = [
  [/\bEdg(?:e|A|iOS)?\//u, "Edge"],
  [/\b(?:OPR|Opera)\//u, "Opera"],
  [/\bSamsungBrowser\//u, "Samsung Internet"],
  [/\bVivaldi\//u, "Vivaldi"],
  [/\b(?:Firefox|FxiOS)\//u, "Firefox"],
  [/\b(?:Chrome|CriOS|Chromium)\//u, "Chrome"],
  [/\bVersion\/[\d.]+.*\bSafari\//u, "Safari"],
] as const

const SYSTEMS = [
  [/\biPad\b/u, "iPadOS"],
  [/\b(?:iPhone|iPod)\b/u, "iOS"],
  [/\bAndroid\b/u, "Android"],
  [/\bWindows\b/u, "Windows"],
  [/\bCrOS\b/u, "ChromeOS"],
  [/\bMac OS X\b|\bMacintosh\b/u, "macOS"],
  [/\bLinux\b/u, "Linux"],
] as const

const firstMatch = (patterns: readonly (readonly [RegExp, string])[], userAgent: string): string | undefined =>
  patterns.find(([pattern]) => pattern.test(userAgent))?.[1]

export const sessionDevice = ({ userAgent }: { readonly userAgent?: string | null | undefined }): SessionDevice => {
  const agent = userAgent ?? ""

  return {
    browser: firstMatch(BROWSERS, agent),
    isMobile: MOBILE_USER_AGENT_PATTERN.test(agent),
    os: firstMatch(SYSTEMS, agent),
  }
}
