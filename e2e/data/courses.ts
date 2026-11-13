import { TEST_VIDEO } from "./videos"

export const TEST_COURSE = {
  chapter: { id: "0195a2b4-6c8d-7e9f-8a0b-00000000c0a1", title: { "en-US": "Foundations", "pl-PL": "Podstawy" } },
  id: "0195a2b4-6c8d-7e9f-8a0b-00000000c0c0",
  kind: "course",
  slug: "the-walkthrough",
  summary: { "en-US": "How the code you receive works, subsystem by subsystem.", "pl-PL": "Jak działa kod, który otrzymujesz, moduł po module." },
  title: { "en-US": "The walkthrough", "pl-PL": "Przewodnik po kodzie" },
} as const

export const TEST_LESSONS = [
  {
    access: "preview",
    id: "0195a2b4-6c8d-7e9f-8a0b-00000000c001",
    slug: "module-boundaries",
    summary: { "en-US": "Why every feature starts at the module boundary." },
    title: { "en-US": "Architecture and module boundaries", "pl-PL": "Architektura i granice modułów" },
    videoId: TEST_VIDEO.id,
  },
  {
    access: "account",
    id: "0195a2b4-6c8d-7e9f-8a0b-00000000c002",
    slug: "auth-and-sessions",
    summary: { "en-US": "Sessions, cookies and the edge cases." },
    title: { "en-US": "Authentication and session security" },
    videoId: TEST_VIDEO.id,
  },
  {
    access: "paid",
    id: "0195a2b4-6c8d-7e9f-8a0b-00000000c003",
    slug: "billing-and-webhooks",
    summary: { "en-US": "The webhook that must not charge twice." },
    title: { "en-US": "Billing, webhooks and pricing models" },
    videoId: TEST_VIDEO.id,
  },
  {
    access: "paid",
    id: "0195a2b4-6c8d-7e9f-8a0b-00000000c004",
    slug: "coverage-gate",
    summary: { "en-US": "Test strategy and the coverage gate." },
    title: { "en-US": "Test strategy and the coverage gate" },
    videoId: null,
  },
] as const
