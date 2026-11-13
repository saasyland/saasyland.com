import { describe, expect, it } from "vite-plus/test"

import { fromHex, randomHex, sha256Hex, toHex } from "~/src/lib/hex"

const SAMPLE_SIZE = 50

describe("sha256Hex", () => {
  it.each([
    { digest: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", value: "" },
    { digest: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad", value: "abc" },
  ])("returns the lowercase hex SHA-256 of $value", async ({ digest, value }) => {
    expect(await sha256Hex(value)).toBe(digest)
  })
})

describe("randomHex", () => {
  it.each([1, 2, 7, 64])("returns %i lowercase hex characters", (length) => {
    expect(randomHex(length)).toMatch(new RegExp(`^[0-9a-f]{${String(length)}}$`, "u"))
  })

  it("returns a different value on every call", () => {
    expect(new Set(Array.from({ length: SAMPLE_SIZE }, () => randomHex(32))).size).toBe(SAMPLE_SIZE)
  })
})

describe("toHex and fromHex", () => {
  it("round-trips bytes through lowercase hex", () => {
    const bytes = Uint8Array.of(0, 1, 15, 16, 127, 128, 255)

    expect(toHex(bytes)).toBe("00010f107f80ff")
    expect([...fromHex("00010f107f80ff")]).toStrictEqual([...bytes])
  })

  it("ignores a trailing half byte", () => {
    expect(toHex(fromHex("abc"))).toBe("ab")
  })
})
