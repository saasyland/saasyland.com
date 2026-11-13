const HEX_RADIX = 16
const HEX_DIGITS_PER_BYTE = 2

export const toHex = (bytes: Uint8Array): string =>
  Array.from(bytes, (byte) => byte.toString(HEX_RADIX).padStart(HEX_DIGITS_PER_BYTE, "0")).join("")

export const fromHex = (hex: string): Uint8Array<ArrayBuffer> =>
  Uint8Array.from({ length: Math.floor(hex.length / HEX_DIGITS_PER_BYTE) }, (_, index) =>
    Number.parseInt(hex.slice(index * HEX_DIGITS_PER_BYTE, index * HEX_DIGITS_PER_BYTE + HEX_DIGITS_PER_BYTE), HEX_RADIX),
  )

export const randomHex = (length: number): string => {
  const bytes = crypto.getRandomValues(new Uint8Array(Math.ceil(length / HEX_DIGITS_PER_BYTE)))

  return toHex(bytes).slice(0, length)
}

export const sha256Hex = async (value: string): Promise<string> => {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))

  return toHex(new Uint8Array(digest))
}
