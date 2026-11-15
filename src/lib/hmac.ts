import { fromHex, toHex } from "~/src/lib/hex"

const encoder = new TextEncoder()
const keys = new Map<string, Promise<CryptoKey>>()

interface Purpose {
  readonly info: string
  readonly secret: string
}

interface Signed extends Purpose {
  readonly message: string
}

const purposeKey = ({ info, secret }: Purpose): Promise<CryptoKey> => {
  const id = JSON.stringify([info, secret])
  const existing = keys.get(id)
  if (existing !== undefined) {
    return existing
  }

  const key = crypto.subtle
    .importKey("raw", encoder.encode(secret), "HKDF", false, ["deriveKey"])
    .then((material) =>
      crypto.subtle.deriveKey(
        { hash: "SHA-256", info: encoder.encode(info), name: "HKDF", salt: new Uint8Array() },
        material,
        { hash: "SHA-256", name: "HMAC" },
        false,
        ["sign", "verify"],
      ),
    )
  keys.set(id, key)

  return key
}

export const signHmac = async ({ message, ...purpose }: Signed): Promise<string> => {
  const signature = await crypto.subtle.sign("HMAC", await purposeKey(purpose), encoder.encode(message))

  return toHex(new Uint8Array(signature))
}

export const verifyHmac = async ({ message, signature, ...purpose }: Signed & { readonly signature: string }): Promise<boolean> =>
  crypto.subtle.verify("HMAC", await purposeKey(purpose), fromHex(signature), encoder.encode(message))
