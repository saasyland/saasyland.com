import { useRouterState } from "@tanstack/react-router"
import zod from "zod/v4"

import { searchText } from "~/src/lib/search-params"

const prefilledEmailSchema = zod.object({ email: searchText() })

export const usePrefilledEmail = (): string =>
  useRouterState({ select: ({ location }) => prefilledEmailSchema.parse(location.search).email ?? "" })
