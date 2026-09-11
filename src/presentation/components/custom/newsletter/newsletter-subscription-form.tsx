import { type JSX, Suspense, lazy, useCallback, useState } from "react"

import { NewsletterSubscriptionFormPlaceholder } from "~/src/presentation/components/custom/newsletter/newsletter-subscription-fields"

const NewsletterSubscriptionFormClient = lazy(async () => {
  const formModule = await import("~/src/presentation/components/custom/newsletter/newsletter-subscription-form-client")
  return { default: formModule.NewsletterSubscriptionFormClient }
})

const PRELOAD_MARGIN = "600px"

export const NewsletterSubscriptionForm = (): JSX.Element => {
  const [isInteractive, setIsInteractive] = useState(false)

  const observeForm = useCallback((element: HTMLFormElement): (() => void) => {
    const activate = (): void => {
      setIsInteractive(true)
    }

    element.addEventListener("focusin", activate, { once: true })

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting === true) {
          setIsInteractive(true)
        }
      },
      { rootMargin: PRELOAD_MARGIN },
    )
    observer.observe(element)

    return () => {
      element.removeEventListener("focusin", activate)
      observer.disconnect()
    }
  }, [])

  if (isInteractive) {
    return (
      <Suspense fallback={<NewsletterSubscriptionFormPlaceholder />}>
        <NewsletterSubscriptionFormClient />
      </Suspense>
    )
  }

  return <NewsletterSubscriptionFormPlaceholder ref={observeForm} />
}
