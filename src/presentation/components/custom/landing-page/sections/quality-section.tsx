import type { JSX } from "react"

import { ArrowRight, Check } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { MARKETING_SECTION_IDS } from "~/src/data/marketing"

import { ConceptLoop } from "~/src/presentation/components/custom/landing-page/components/concept-loop"
import { Reveal } from "~/src/presentation/components/custom/landing-page/components/reveal"

const SPEC_KEYS = ["vitest", "playwright", "typescript"] as const

const TERMINAL_DELAY_MS = 120

const TERMINAL_LINES = [
  { kind: "command", text: "bun run test:coverage" },
  { kind: "output", text: "Test Files  140 passed (140)" },
  { kind: "output", text: "     Tests  1284 passed (1284)" },
  { kind: "blank", text: "" },
  { kind: "pass", text: "% Stmts     100" },
  { kind: "pass", text: "% Branch    100" },
  { kind: "pass", text: "% Funcs     100" },
  { kind: "pass", text: "% Lines     100" },
] as const

const TERMINAL_IMAGE_SIZES =
  "(min-width: 80rem) calc((80rem - 9rem) * 1.05 / 2.05 - 2px), (min-width: 64rem) calc((100vw - 9rem) * 1.05 / 2.05 - 2px), (min-width: 48rem) calc(100vw - 5rem - 2px), calc(100vw - 3rem - 2px)"

const TerminalRow = ({ line }: Readonly<{ line: (typeof TERMINAL_LINES)[number] }>): JSX.Element => {
  if (line.kind === "command") {
    return (
      <div className="whitespace-pre">
        <span className="text-muted-foreground/50 select-none">$ </span>
        <span className="text-foreground">{line.text}</span>
      </div>
    )
  }

  if (line.kind === "pass") {
    return (
      <div className="whitespace-pre">
        <span className="text-ring select-none">{"✓ "}</span>
        <span className="text-foreground">{line.text}</span>
      </div>
    )
  }

  if (line.kind === "blank") {
    return <div className="whitespace-pre"> </div>
  }

  return <div className="whitespace-pre text-muted-foreground">{line.text}</div>
}

export const QualitySection = (): JSX.Element => {
  const t = useTranslations("pages.landing.quality")

  return (
    <section className="relative border-t border-border" id={MARKETING_SECTION_IDS.QUALITY}>
      <div className="mx-auto grid w-full max-w-7xl gap-x-16 gap-y-14 px-6 py-24 md:px-10 md:py-32 lg:grid-cols-[1fr_1.05fr] lg:items-start">
        <Reveal variant="heading">
          <h2 className="max-w-[14ch] text-headline-peak text-balance text-foreground">{t("title")}</h2>
          <p className="mt-5 max-w-xl text-statement text-pretty text-foreground">{t("lead")}</p>
          <p className="mt-5 max-w-xl text-body text-pretty text-muted-foreground">{t("body")}</p>
          <p className="mt-4 max-w-xl text-body text-pretty text-muted-foreground">{t("consequence")}</p>

          <ul className="mt-8 space-y-2.5 border-t border-border pt-8">
            {SPEC_KEYS.map((key) => (
              <li className="flex items-start gap-3" key={key}>
                <Check aria-hidden className="mt-0.5 size-3.5 shrink-0 text-ring" strokeWidth={2.25} />
                <span className="font-mono text-spec text-pretty text-muted-foreground">{t(`specs.${key}`)}</span>
              </li>
            ))}
          </ul>

          <a
            className="group mt-10 inline-flex items-center gap-2 rounded-sm text-body-sm font-medium text-foreground transition-colors duration-200 ease-exp hover:text-muted-foreground focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring"
            href={`#${MARKETING_SECTION_IDS.PRICING}`}
          >
            {t("cta")}
            <ArrowRight
              aria-hidden
              className="size-3.5 transition-transform duration-200 ease-exp group-hover:translate-x-0.5 motion-reduce:transition-none"
              strokeWidth={2}
            />
          </a>
        </Reveal>

        <Reveal className="min-w-0 lg:sticky lg:top-24" delay={TERMINAL_DELAY_MS}>
          <div className="overflow-hidden rounded-xl border border-border bg-card">
            <div className="flex items-center gap-2.5 border-b border-border bg-background/40 px-4 py-2.5">
              <span aria-hidden className="size-1.5 shrink-0 rounded-full bg-ring" />
              <span className="font-mono text-spec text-muted-foreground">{t("terminalTitle")}</span>
            </div>

            <ConceptLoop className="motion-reduce:hidden max-sm:hidden" name="coverage-run" sizes={TERMINAL_IMAGE_SIZES} />

            <pre className="custom-scrollbar sr-only overflow-x-auto p-5 font-mono text-spec leading-[1.9] motion-reduce:not-sr-only max-sm:not-sr-only md:p-7">
              {TERMINAL_LINES.map((line) => (
                <TerminalRow key={line.text || line.kind} line={line} />
              ))}
            </pre>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
