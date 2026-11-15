import type { TestSeed } from "./seed"

export const coreSeed = (): Promise<TestSeed> => Promise.resolve({ objects: [], statements: [] })
