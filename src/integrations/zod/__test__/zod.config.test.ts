import { expect, it } from "vite-plus/test"
import zod from "zod/v4"

import "~/src/integrations/zod/zod.config"

it("parses without compiling code, so zod never probes for eval under a strict Content Security Policy", () => {
  expect(zod.config().jitless).toBe(true)
})
