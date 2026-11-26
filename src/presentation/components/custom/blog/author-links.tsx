import type { ComponentProps, JSX } from "react"

import { useTranslations } from "use-intl/react"

import { AUTHOR_PROFILE, type AuthorProfile, BLOG_AUTHORS, type BlogAuthor } from "~/src/data/blog"

import { Github, LinkedIn } from "~/src/presentation/components/custom/icons"

const PROFILE_ICONS: Record<AuthorProfile, (props: ComponentProps<"svg">) => JSX.Element> = {
  [AUTHOR_PROFILE.GITHUB]: Github,
  [AUTHOR_PROFILE.LINKEDIN]: LinkedIn,
}

export const AuthorLinks = ({ author }: { readonly author: BlogAuthor }): JSX.Element => {
  const t = useTranslations("pages.blog.author.profiles")

  const { name, profiles } = BLOG_AUTHORS[author]

  return (
    <ul className="flex items-center">
      {profiles.map(({ network, url }) => {
        const Icon = PROFILE_ICONS[network]

        return (
          <li key={network}>
            <a
              aria-label={t(network, { name })}
              className="inline-flex items-center justify-center rounded-md p-1.5 text-muted-foreground transition-colors duration-200 ease-exp hover:bg-muted hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
              href={url}
              rel="me noopener noreferrer"
              target="_blank"
            >
              <Icon className="size-4" />
            </a>
          </li>
        )
      })}
    </ul>
  )
}
