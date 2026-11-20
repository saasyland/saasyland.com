import { createServerOnlyFn } from "@tanstack/react-start"
import { createTranslator } from "use-intl"

import { loadNamespace } from "~/src/integrations/use-intl/i18n.messages"

import { holdsCourseAccess } from "~/src/data/course-access"
import type { PurchaseEmailContext, PurchaseEmailLine, PurchaseEmailStep } from "~/src/data/purchase-email"

import type coursesStepMessages from "~/messages/en-US/purchase-email.courses.json"
import { ROUTES } from "~/src/routes"

const NAMESPACE = "purchase-email.courses"

export const COURSES_PURCHASE_EMAIL = [
  {
    key: "courses",
    line: createServerOnlyFn(async ({ locale, userId }: PurchaseEmailContext): Promise<PurchaseEmailLine | undefined> => {
      if (!(await holdsCourseAccess(userId))) {
        return undefined
      }

      const messages = await loadNamespace<typeof coursesStepMessages>({ locale, namespace: NAMESPACE })
      const t = createTranslator({ locale, messages: { "purchase-email": { courses: messages } }, namespace: "purchase-email.courses" })

      return { link: t("link"), pathname: ROUTES.COURSES, text: t("text") }
    }),
  },
] as const satisfies readonly PurchaseEmailStep[]
