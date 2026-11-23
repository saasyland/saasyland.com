import { createHmac } from "node:crypto"

import { MILLISECONDS_PER_SECOND } from "../../src/lib/duration"

const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567"
const BITS_PER_CHARACTER = 5
const BITS_PER_BYTE = 8
const PERIOD_SECONDS = 30
const DIGITS = 6
const COUNTER_BYTES = 8
const OFFSET_MASK = 0x0f
const CODE_MASK = 0x7f_ff_ff_ff
const LAST_BYTE_INDEX = -1

const decodeBase32 = (secret: string): Buffer => {
  const bits = [...secret.toUpperCase().replaceAll("=", "")]
    .map((character) => BASE32_ALPHABET.indexOf(character).toString(2).padStart(BITS_PER_CHARACTER, "0"))
    .join("")
  const bytes = bits.match(new RegExp(`.{${String(BITS_PER_BYTE)}}`, "gu")) ?? []

  return Buffer.from(bytes.map((byte) => Number.parseInt(byte, 2)))
}

export const totpCode = (secret: string, at = Date.now()): string => {
  const counter = Buffer.alloc(COUNTER_BYTES)
  counter.writeBigUInt64BE(BigInt(Math.floor(at / MILLISECONDS_PER_SECOND / PERIOD_SECONDS)))
  const digest = createHmac("sha1", decodeBase32(secret)).update(counter).digest()
  const offset = (digest.at(LAST_BYTE_INDEX) ?? 0) & OFFSET_MASK

  return String((digest.readUInt32BE(offset) & CODE_MASK) % 10 ** DIGITS).padStart(DIGITS, "0")
}
