import type { JSX } from "react"

import { Link, Text } from "react-email"

interface EmailFallbackLinkProps {
  readonly label: string
  readonly url: string
}

export const EmailFallbackLink = ({ label, url }: Readonly<EmailFallbackLinkProps>): JSX.Element => (
  <Text className="mt-6 mb-0 text-sm text-neutral-500">
    {label}
    <br />
    <Link className="break-all text-neutral-900 underline" href={url}>
      {url}
    </Link>
  </Text>
)
