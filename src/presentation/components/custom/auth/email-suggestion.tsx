import type { JSX, ReactNode } from "react"

import { useTranslations } from "use-intl/react"

import { suggestEmail } from "~/src/lib/email-suggestion"

import { Button } from "~/src/presentation/components/shadcn/button"

interface EmailSuggestionProps {
  readonly email: string
  readonly id: string
  readonly isShown: boolean
  readonly onAccept: (email: string) => void
}

const suggestionTag =
  (onPress: () => void) =>
  (chunks: ReactNode): JSX.Element => (
    <Button
      className="inline h-auto rounded-sm p-0 align-baseline text-body-sm font-medium wrap-anywhere whitespace-normal text-foreground"
      onPress={onPress}
      variant="link"
    >
      {chunks}
    </Button>
  )

const Suggestion = ({ email, onAccept }: Pick<EmailSuggestionProps, "email" | "onAccept">): JSX.Element | undefined => {
  const t = useTranslations("auth.form")

  const suggestion = suggestEmail(email)

  if (suggestion === undefined) {
    return
  }

  return (
    <>
      {t.rich("emailSuggestion", {
        email: suggestion,
        suggestion: suggestionTag(() => {
          onAccept(suggestion)
        }),
      })}
    </>
  )
}

export const EmailSuggestion = ({ email, id, isShown, onAccept }: EmailSuggestionProps): JSX.Element => (
  <p className="text-body-sm text-pretty text-muted-foreground empty:sr-only" id={id} role="status">
    {isShown && <Suggestion email={email} onAccept={onAccept} />}
  </p>
)
