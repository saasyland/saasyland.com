import { describe, expect, it } from "vite-plus/test"

import { EMAIL_DOMAINS } from "~/src/data/email-domains"

import { suggestEmail } from "~/src/lib/email-suggestion"

describe("suggestEmail", () => {
  it.each([
    ["ada@gmial.com", "ada@gmail.com"],
    ["ada@gmail.con", "ada@gmail.com"],
    ["ada@hotmial.co", "ada@hotmail.com"],
    ["ada@tonline.de", "ada@t-online.de"],
    ["ada@libero.ti", "ada@libero.it"],
    ["ada@me.ocm", "ada@me.com"],
  ])("corrects %s to %s", (email, suggestion) => {
    expect(suggestEmail(email)).toBe(suggestion)
  })

  it("picks the closest domain when a farther one is also within reach", () => {
    expect(suggestEmail("ada@uol.com.b")).toBe("ada@uol.com.br")
  })

  it.each(EMAIL_DOMAINS)("never corrects an address at %s", (domain) => {
    expect(suggestEmail(`ada@${domain}`)).toBeUndefined()
  })

  it.each(["ada@company.io", "ada@saasyland.com", "ada@university.edu.pl"])("leaves the unrelated address %s alone", (email) => {
    expect(suggestEmail(email)).toBeUndefined()
  })

  it.each(["ada@hey.com", "ada@aig.com", "ada@gmx.fr"])("allows only one edit on a short domain, so %s stays as typed", (email) => {
    expect(suggestEmail(email)).toBeUndefined()
  })

  it.each(["ada.gmial.com", "ada@", "@gmial.com", ""])("suggests nothing without a local part and a domain in %j", (email) => {
    expect(suggestEmail(email)).toBeUndefined()
  })

  it("suggests nothing when two listed domains are equally close", () => {
    expect(suggestEmail("ada@gmx.ne")).toBeUndefined()
  })

  it("compares the domain in lower case and keeps the local part as typed", () => {
    expect(suggestEmail("Ada.Lovelace@GMIAL.COM")).toBe("Ada.Lovelace@gmail.com")
    expect(suggestEmail("Ada.Lovelace@Gmail.COM")).toBeUndefined()
  })

  it("splits the address on its last @", () => {
    expect(suggestEmail("ada@home@gmial.com")).toBe("ada@home@gmail.com")
  })
})
