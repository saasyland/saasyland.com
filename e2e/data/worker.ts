export const TEST_WORKER_KIND = {
  ENDPOINT: "endpoint",
  SETUP: "setup",
} as const

interface TestEndpoint {
  readonly kind: typeof TEST_WORKER_KIND.ENDPOINT
  readonly path: string
  readonly respond: (url: URL, env: Cloudflare.Env) => Promise<Response>
}

interface TestSetup {
  readonly kind: typeof TEST_WORKER_KIND.SETUP
  readonly setup: () => Promise<void>
}

export type TestWorkerEntry = TestEndpoint | TestSetup
