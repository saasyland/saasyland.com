import type { ComponentProps, JSX } from "react"

import { cn } from "~/src/lib/cn"

import { Icons } from "~/src/presentation/components/custom/icons"

interface GithubInfoProps extends ComponentProps<"a"> {
  owner: string
  repo: string
}

export const GithubInfo = ({ owner, repo, className, ...rest }: Readonly<GithubInfoProps>): JSX.Element => (
  <a
    target="_blank"
    rel="noreferrer noopener"
    href={`https://github.com/${owner}/${repo}`}
    className={cn(
      "text-fd-foreground/80 hover:bg-fd-accent hover:text-fd-accent-foreground flex flex-col gap-1.5 rounded-lg p-2 text-sm transition-colors",
      className,
    )}
    {...rest}
  >
    <p className="flex items-center gap-2 truncate">
      <Icons.Github className="size-3.5" />
      {owner}/{repo}
    </p>
  </a>
)
