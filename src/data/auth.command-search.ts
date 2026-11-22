import { UserRound } from "lucide-react"

import { searchUsersQuery } from "~/src/modules/user/use-cases/search-users"

import type { CommandSearch } from "~/src/data/command-search"

const AREA = "auth"

export const AUTH_COMMAND_SEARCHES = [
  {
    area: AREA,
    icon: UserRound,
    key: "users",
    order: 10,
    permission: { user: ["list"] },
    query: ({ text }) => searchUsersQuery({ text }),
  },
] as const satisfies readonly CommandSearch[]
