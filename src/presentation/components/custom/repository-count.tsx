import type { JSX } from "react"

import { useFormatter } from "use-intl/react"

import { REPOSITORY_FACTS } from "~/src/data/repository-facts"

export const RepositoryCount = ({ fact }: { readonly fact: keyof typeof REPOSITORY_FACTS }): JSX.Element => {
  const format = useFormatter()

  return <>{format.number(REPOSITORY_FACTS[fact])}</>
}
