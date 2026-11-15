interface SessionDevice {
  readonly ipAddress?: string | null | undefined
  readonly userAgent?: string | null | undefined
}

const MOBILE_USER_AGENT_PATTERN = /mobile|iphone|android|ipad|ipod/iu

export const sessionDeviceLabel = ({ ipAddress, userAgent }: SessionDevice): string | undefined => {
  if (typeof userAgent === "string" && userAgent !== "") {
    return userAgent
  }

  if (typeof ipAddress === "string" && ipAddress !== "") {
    return ipAddress
  }

  return undefined
}

export const isMobileSession = ({ userAgent }: SessionDevice): boolean =>
  typeof userAgent === "string" && MOBILE_USER_AGENT_PATTERN.test(userAgent)
