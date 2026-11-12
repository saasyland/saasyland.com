import { describe, expect, it } from "vite-plus/test"

import { sha256Hex } from "~/src/lib/hash"

describe("sha256Hex", () => {
  it.each([
    { digest: "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855", value: "" },
    { digest: "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad", value: "abc" },
  ])("returns the lowercase hex SHA-256 of $value", async ({ digest, value }) => {
    expect(await sha256Hex(value)).toBe(digest)
  })
})
