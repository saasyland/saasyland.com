export const TEST_VIDEO = {
  durationMs: 2000,
  fixture: "e2e/fixtures/video",
  height: 180,
  id: "0195a2b4-6c8d-7e9f-8a0b-00000000e2e0",
  placeholder: false,
  title: "Test pattern",
  width: 320,
} as const

export const TEST_PLACEHOLDER_VIDEO = {
  ...TEST_VIDEO,
  id: "0195a2b4-6c8d-7e9f-8a0b-00000000e2e1",
  placeholder: true,
  title: "Being recorded",
} as const

export const TEST_SPARE_VIDEO = {
  ...TEST_VIDEO,
  id: "0195a2b4-6c8d-7e9f-8a0b-00000000e2e2",
  title: "Spare take",
} as const

export const TEST_VIDEOS = [TEST_VIDEO, TEST_PLACEHOLDER_VIDEO, TEST_SPARE_VIDEO] as const
