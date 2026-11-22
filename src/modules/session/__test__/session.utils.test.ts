import { describe, expect, it } from "vite-plus/test"

import { sessionDevice } from "~/src/modules/session/session.utils"

describe("session device", () => {
  it.each([
    [
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36",
      { browser: "Chrome", isMobile: false, os: "macOS" },
    ],
    [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0",
      { browser: "Edge", isMobile: false, os: "Windows" },
    ],
    [
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:145.0) Gecko/20100101 Firefox/145.0",
      { browser: "Firefox", isMobile: false, os: "Windows" },
    ],
    [
      "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1",
      { browser: "Safari", isMobile: true, os: "iOS" },
    ],
    [
      "Mozilla/5.0 (iPad; CPU OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/142.0.0.0 Mobile/15E148 Safari/604.1",
      { browser: "Chrome", isMobile: true, os: "iPadOS" },
    ],
    [
      "Mozilla/5.0 (Linux; Android 15; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) SamsungBrowser/28.0 Chrome/130.0.0.0 Mobile Safari/537.36",
      { browser: "Samsung Internet", isMobile: true, os: "Android" },
    ],
    [
      "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 OPR/124.0.0.0",
      { browser: "Opera", isMobile: false, os: "Linux" },
    ],
    [
      "Mozilla/5.0 (X11; CrOS x86_64 16181.61.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Vivaldi/7.6",
      { browser: "Vivaldi", isMobile: false, os: "ChromeOS" },
    ],
    ["curl/8.7.1", { browser: undefined, isMobile: false, os: undefined }],
    ["", { browser: undefined, isMobile: false, os: undefined }],
  ])("reads %s", (userAgent, device) => {
    expect(sessionDevice({ userAgent })).toStrictEqual(device)
  })

  it.each([null, undefined])("knows nothing about a session without a user agent (%s)", (userAgent) => {
    expect(sessionDevice({ userAgent })).toStrictEqual({ browser: undefined, isMobile: false, os: undefined })
  })
})
