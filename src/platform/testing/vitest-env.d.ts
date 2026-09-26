/// <reference types="vite-plus/test/globals" />

import type { TestingLibraryMatchers } from "@testing-library/jest-dom/matchers"
import "vite-plus/test"

declare module "vitest" {
  interface Matchers<R, T> extends TestingLibraryMatchers<T, R> {}
}
