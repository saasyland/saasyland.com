import type { useTranslations } from "use-intl/react"
import { expectTypeOf, it } from "vite-plus/test"

type RootKey = Parameters<ReturnType<typeof useTranslations<never>>>[0]
type CommonKey = Parameters<ReturnType<typeof useTranslations<"common">>>[0]

it("constrains root and namespaced translator keys, including variable keys", () => {
  expectTypeOf<"common.yes">().toExtend<RootKey>()
  expectTypeOf<"yes">().toExtend<CommonKey>()
  expectTypeOf<"common.auditMissingMessage">().not.toExtend<RootKey>()
  expectTypeOf<"auditMissingMessage">().not.toExtend<CommonKey>()
  expectTypeOf<string>().not.toExtend<RootKey>()
  expectTypeOf<string>().not.toExtend<CommonKey>()
})
