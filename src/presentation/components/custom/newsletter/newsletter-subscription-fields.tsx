import { type JSX, type Ref } from "react"

import { ArrowRight } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { AUTH_VALIDATION_PARAMS } from "~/src/integrations/better-auth/auth.validations"

import { cn } from "~/src/lib/cn"

import { Spinner } from "~/src/presentation/components/shadcn/spinner"

import { ValidationFieldError } from "~/src/presentation/components/custom/validation-field-error"

const INPUT_ID = "newsletter-email"
const ERROR_ID = "newsletter-email-error"
const SUBMIT_ID = "newsletter-submit"

interface NewsletterSubscriptionFieldsProps {
  readonly isPending: boolean
  readonly isReadOnly: boolean
  readonly message?: string | undefined
  readonly onBlur?: (() => void) | undefined
  readonly onChange?: ((value: string) => void) | undefined
  readonly value: string
}

export const NewsletterSubscriptionFields = ({
  isPending,
  isReadOnly,
  message,
  onBlur,
  onChange,
  value,
}: NewsletterSubscriptionFieldsProps): JSX.Element => {
  const t = useTranslations("pages.newsletter.form")
  const focusedId = typeof document === "undefined" ? undefined : document.activeElement?.id

  return (
    <>
      <label className="sr-only" htmlFor={INPUT_ID}>
        {t("label")}
      </label>
      <div
        className={cn("flex items-center gap-4 border-b transition-colors duration-200 ease-exp", {
          "border-border focus-within:border-foreground": message === undefined,
          "border-destructive": message !== undefined,
        })}
      >
        <input
          readOnly={isReadOnly}
          name="email"
          value={value}
          onBlur={onBlur}
          onChange={(event) => {
            onChange?.(event.target.value)
          }}
          aria-describedby={ERROR_ID}
          aria-invalid={message !== undefined}
          autoComplete="email"
          autoFocus={focusedId === INPUT_ID}
          className="h-11 w-full min-w-0 bg-transparent px-3 font-sans text-body-sm font-medium text-foreground placeholder:text-muted-foreground focus-visible:outline-none disabled:opacity-50"
          disabled={isPending}
          id={INPUT_ID}
          placeholder={t("placeholder")}
          type="email"
        />
        <button
          autoFocus={focusedId === SUBMIT_ID}
          className="group flex h-11 shrink-0 items-center gap-2 font-sans text-body-sm font-semibold whitespace-nowrap text-foreground transition-[color,opacity] duration-200 ease-exp hover:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:pointer-events-none disabled:opacity-50"
          disabled={isPending}
          id={SUBMIT_ID}
          type="submit"
        >
          {isPending && <Spinner />}
          {isPending ? t("submitting") : t("button")}
          {!isPending && (
            <ArrowRight
              aria-hidden
              className="size-4 transition-transform duration-200 ease-exp group-hover:translate-x-0.5"
              strokeWidth={1.5}
            />
          )}
        </button>
      </div>
      <div className="mt-2 min-h-5 font-mono text-spec" id={ERROR_ID}>
        <ValidationFieldError message={message} namespace="auth.validations" paramsByKey={AUTH_VALIDATION_PARAMS} />
      </div>
    </>
  )
}

export const NewsletterSubscriptionFormPlaceholder = ({ ref }: { readonly ref?: Ref<HTMLFormElement> }): JSX.Element => (
  <form
    className="mt-6"
    noValidate
    ref={ref}
    onSubmit={(event) => {
      event.preventDefault()
    }}
  >
    <NewsletterSubscriptionFields isPending={false} isReadOnly value="" />
  </form>
)
