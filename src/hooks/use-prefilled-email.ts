import { useRouterState } from "@tanstack/react-router"
import * as zod from "zod"

import { searchText } from "~/src/lib/search-params"

const prefilledEmailSchema = zod.object({ email: searchText() })

export const usePrefilledEmail = (): string =>
  useRouterState({ select: ({ location }) => prefilledEmailSchema.parse(location.search).email ?? "" })
