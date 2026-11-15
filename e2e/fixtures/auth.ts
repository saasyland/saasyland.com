import { AuthPage } from "../pages"
import { test as base } from "./test"

export const test = base.extend<{ authPage: AuthPage }>({
  authPage: async ({ page }, runWith) => {
    await runWith(new AuthPage(page))
  },
})

export { expect } from "./test"
