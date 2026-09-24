/// <reference types="vite-plus/test/globals" />

import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers"
import "vite-plus/test"

// Adapt jest-dom's pre-v5 matcher types to Vitest 5.
declare module "vitest" {
  interface Matchers<R, T> extends TestingLibraryMatchers<T, R> {}
}
