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

export const EmailSuggestion = ({ email, id, isShown, onAccept }: EmailSuggestionProps): JSX.Element => {
  const t = useTranslations("auth.form")

  const suggestion = isShown ? suggestEmail(email) : undefined

  return (
    <p className="text-body-sm text-pretty text-muted-foreground empty:sr-only" id={id} role="status">
      {suggestion !== undefined &&
        t.rich("emailSuggestion", {
          email: suggestion,
          suggestion: suggestionTag(() => {
            onAccept(suggestion)
          }),
        })}
    </p>
  )
}
