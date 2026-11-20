import type { JSX } from "react"

import { Section, Text } from "react-email"

import { APP_NAME } from "~/src/presentation/branding"

export const EmailBrandHeader = (): JSX.Element => (
  <Section className="mb-8 border-0 border-b border-solid border-neutral-200 pb-4">
    <Text className="m-0 text-lg font-bold tracking-tight text-neutral-900">{APP_NAME}</Text>
  </Section>
)
