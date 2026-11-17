import { COURSE_ICON, COURSE_KIND, COURSE_LEVEL } from "../../src/modules/course/course.constants"
import { LESSON_ATTACHMENT_KIND } from "../../src/modules/lesson-attachment/lesson-attachment.constants"
import { LESSON_ACCESS } from "../../src/modules/lesson/lesson.constants"
import { TEST_PLACEHOLDER_VIDEO, TEST_VIDEO } from "./videos"

export const TEST_COURSE = {
  chapter: {
    id: "0195a2b4-6c8d-7e9f-8a0b-00000000c0a1",
    summary: { "en-US": "The shape of the code before any feature.", "pl-PL": "Kształt kodu przed pierwszą funkcją." },
    title: { "en-US": "Foundations", "pl-PL": "Podstawy" },
  },
  icon: COURSE_ICON.MAP,
  id: "0195a2b4-6c8d-7e9f-8a0b-00000000c0c0",
  kind: COURSE_KIND.COURSE,
  level: COURSE_LEVEL.INTERMEDIATE,
  outcomes: { "en-US": ["Follow one request end to end", "Add a module the way the code expects"] },
  prerequisites: { "en-US": ["The project running locally"] },
  slug: "the-walkthrough",
  summary: { "en-US": "How the code you receive works, subsystem by subsystem.", "pl-PL": "Jak działa kod, który otrzymujesz, moduł po module." },
  title: { "en-US": "The walkthrough", "pl-PL": "Przewodnik po kodzie" },
} as const

export const TEST_LESSONS = [
  {
    access: LESSON_ACCESS.PREVIEW,
    description: { "en-US": "Every feature starts at a module.\n\nOpen `src/modules` and follow one table." },
    id: "0195a2b4-6c8d-7e9f-8a0b-00000000c001",
    keyMoments: [{ label: { "en-US": "The modules folder" }, seconds: 1 }],
    slug: "module-boundaries",
    summary: { "en-US": "Why every feature starts at the module boundary." },
    title: { "en-US": "Architecture and module boundaries", "pl-PL": "Architektura i granice modułów" },
    videoId: TEST_VIDEO.id,
  },
  {
    access: LESSON_ACCESS.ACCOUNT,
    description: {},
    id: "0195a2b4-6c8d-7e9f-8a0b-00000000c002",
    keyMoments: [],
    slug: "auth-and-sessions",
    summary: { "en-US": "Sessions, cookies and the edge cases." },
    title: { "en-US": "Authentication and session security" },
    videoId: TEST_VIDEO.id,
  },
  {
    access: LESSON_ACCESS.PAID,
    description: {},
    id: "0195a2b4-6c8d-7e9f-8a0b-00000000c003",
    keyMoments: [],
    slug: "billing-and-webhooks",
    summary: { "en-US": "The webhook that must not charge twice." },
    title: { "en-US": "Billing, webhooks and pricing models" },
    videoId: TEST_VIDEO.id,
  },
  {
    access: LESSON_ACCESS.PAID,
    description: {},
    id: "0195a2b4-6c8d-7e9f-8a0b-00000000c004",
    keyMoments: [],
    slug: "coverage-gate",
    summary: { "en-US": "Test strategy and the coverage gate." },
    title: { "en-US": "Test strategy and the coverage gate" },
    videoId: TEST_PLACEHOLDER_VIDEO.id,
  },
] as const

const [preview, , paid] = TEST_LESSONS

export const TEST_MATERIALS = [
  {
    file: "e2e/fixtures/attachment/workbook.pdf",
    fileName: "workbook.pdf",
    id: "0195a2b4-6c8d-7e9f-8a0b-00000000d001",
    kind: LESSON_ATTACHMENT_KIND.FILE,
    lessonId: preview.id,
    title: { "en-US": "Module workbook" },
  },
  {
    id: "0195a2b4-6c8d-7e9f-8a0b-00000000d002",
    kind: LESSON_ATTACHMENT_KIND.LINK,
    lessonId: preview.id,
    title: { "en-US": "Modules reference" },
    url: "/docs/conventions/modules",
  },
  {
    file: "e2e/fixtures/attachment/workbook.pdf",
    fileName: "webhooks.pdf",
    id: "0195a2b4-6c8d-7e9f-8a0b-00000000d003",
    kind: LESSON_ATTACHMENT_KIND.FILE,
    lessonId: paid.id,
    title: { "en-US": "Webhook checklist" },
  },
] as const
