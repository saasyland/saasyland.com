import { QueryClient } from "@tanstack/react-query"
import { describe, expect, it } from "vite-plus/test"

import { buildMessageTree, loadNamespace, messagesQueryOptions, preloadNamespaces } from "~/src/integrations/use-intl/i18n.messages"

describe("bundled locale namespaces", () => {
  it("rejects missing namespace files", async () => {
    await expect(loadNamespace({ locale: "en-US", namespace: "missing" })).rejects.toThrow("No messages/en-US/missing.json")
  })
  it("reports the locale in missing namespace errors", async () => {
    await expect(loadNamespace({ locale: "pl-PL", namespace: "missing" })).rejects.toThrow("No messages/pl-PL/missing.json")
  })
  it("loads independently of the filesystem working directory", async () => {
    expect(await loadNamespace({ locale: "en-US", namespace: "errors.global" })).toHaveProperty("title")
  })
  it("builds nested namespace paths", () => {
    expect(buildMessageTree([["pages.help.contact-us", { title: "Contact us" }]])).toEqual({
      pages: { help: { "contact-us": { title: "Contact us" } } },
    })
  })
  it("merges parent and child namespaces without mutating imported messages", () => {
    const parent = { title: "Console" }
    expect(
      buildMessageTree([
        ["pages.console", parent],
        ["pages.console.users", { title: "Users" }],
      ]),
    ).toEqual({ pages: { console: { title: "Console", users: { title: "Users" } } } })
    expect(
      buildMessageTree([
        ["pages.console.users", { title: "Users" }],
        ["pages.console", parent],
      ]),
    ).toEqual({ pages: { console: { title: "Console", users: { title: "Users" } } } })
    expect(parent).toEqual({ title: "Console" })
  })
  it("keeps a namespace nested below a key of its parent, whichever of the two loads first", () => {
    const parent = { users: { title: "Users" } }
    const merged = { pages: { console: { users: { facts: { lead: "Measured" }, title: "Users" } } } }

    expect(
      buildMessageTree([
        ["pages.console.users.facts", { lead: "Measured" }],
        ["pages.console", parent],
      ]),
    ).toEqual(merged)
    expect(
      buildMessageTree([
        ["pages.console", parent],
        ["pages.console.users.facts", { lead: "Measured" }],
      ]),
    ).toEqual(merged)
    expect(parent).toEqual({ users: { title: "Users" } })
  })
  it("keeps each locale and namespace separate in one query cache", async () => {
    const queryClient = new QueryClient()
    const englishForm = { locale: "en-US", namespace: "errors.global" } as const
    const polishForm = { locale: "pl-PL", namespace: "errors.global" } as const
    const englishSignIn = { locale: "en-US", namespace: "pages.landing" } as const

    await queryClient.query(messagesQueryOptions(englishForm))
    await queryClient.query(messagesQueryOptions(polishForm))
    await queryClient.query(messagesQueryOptions(englishSignIn))

    expect(queryClient.getQueryData(messagesQueryOptions(englishForm).queryKey)).toEqual(await loadNamespace(englishForm))
    expect(queryClient.getQueryData(messagesQueryOptions(polishForm).queryKey)).toEqual(await loadNamespace(polishForm))
    expect(queryClient.getQueryData(messagesQueryOptions(englishSignIn).queryKey)).toEqual(await loadNamespace(englishSignIn))
  })
  it("preloads messages into the same cache used by the provider", async () => {
    const queryClient = new QueryClient()
    await preloadNamespaces({ locale: "en-US", namespaces: ["errors.global"], queryClient })
    expect(queryClient.getQueryData(messagesQueryOptions({ locale: "en-US", namespace: "errors.global" }).queryKey)).toHaveProperty("retry")
  })
})
