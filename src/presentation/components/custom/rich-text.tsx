import type { JSX } from "react"

import { cn } from "~/src/lib/cn"
import { parseRichText } from "~/src/lib/rich-text"

interface RichTextProps {
  readonly className?: string
  readonly lang?: string | undefined
  readonly text: string
}

export const RichText = ({ className, lang, text }: RichTextProps): JSX.Element => (
  <div className={cn("flex flex-col gap-3", className)} lang={lang}>
    {parseRichText(text).map((segments, paragraph) => (
      <p className="whitespace-pre-line" key={paragraph}>
        {segments.map(({ code, text: segment }, index) => {
          if (code) {
            return (
              <code className="rounded-sm bg-muted px-1 py-0.5 font-mono text-code text-foreground" key={index}>
                {segment}
              </code>
            )
          }
          return <span key={index}>{segment}</span>
        })}
      </p>
    ))}
  </div>
)
