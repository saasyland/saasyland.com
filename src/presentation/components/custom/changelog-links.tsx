import type { JSX } from "react"

import { useTranslations } from "use-intl/react"

import { APP_GITHUB_URL } from "~/src/presentation/branding"

const SHORT_COMMIT_LENGTH = 7

const LINK_CLASS_NAME =
  "not-prose text-body-sm whitespace-nowrap text-muted-foreground tabular-nums underline decoration-muted-foreground/40 underline-offset-4 transition-colors duration-200 ease-exp hover:text-foreground hover:decoration-current motion-reduce:transition-none"

export type ChangelogLinksProps = ({ readonly commit: string } | { readonly pullRequest: string }) & { readonly release?: string }

const ChangelogSourceLink = (props: ChangelogLinksProps): JSX.Element => {
  const t = useTranslations("components.custom.changelog-links")

  if ("pullRequest" in props) {
    return (
      <a
        aria-label={t("pullRequest", { number: props.pullRequest })}
        className={LINK_CLASS_NAME}
        href={`${APP_GITHUB_URL}/pull/${props.pullRequest}`}
      >
        {`#${props.pullRequest}`}
      </a>
    )
  }

  const commit = props.commit.slice(0, SHORT_COMMIT_LENGTH)

  return (
    <a aria-label={t("commit", { commit })} className={LINK_CLASS_NAME} href={`${APP_GITHUB_URL}/commit/${props.commit}`}>
      {commit}
    </a>
  )
}

export const ChangelogLinks = (props: ChangelogLinksProps): JSX.Element => {
  const t = useTranslations("components.custom.changelog-links")

  return (
    <>
      <ChangelogSourceLink {...props} />
      {props.release !== undefined && (
        <>
          {" "}
          <a
            aria-label={t("release", { tag: props.release })}
            className={LINK_CLASS_NAME}
            href={`${APP_GITHUB_URL}/releases/tag/${props.release}`}
          >
            {props.release}
          </a>
        </>
      )}
    </>
  )
}
