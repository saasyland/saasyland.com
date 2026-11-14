import { executeQuery } from "~/src/platform/testing/lib/query"

import { I18N } from "~/src/integrations/use-intl/i18n.config"

import { catalogueQuery } from "~/src/modules/course/use-cases/get-catalogue"
import { courseShowcaseQuery } from "~/src/modules/course/use-cases/get-course-showcase"

export const COURSES_PUBLIC_QUERIES = {
  "src/modules/course/use-cases/get-catalogue.ts": () => executeQuery(catalogueQuery({ locale: I18N.DEFAULT_LOCALE })),
  "src/modules/course/use-cases/get-course-showcase.ts": () => executeQuery(courseShowcaseQuery({ locale: I18N.DEFAULT_LOCALE })),
}
