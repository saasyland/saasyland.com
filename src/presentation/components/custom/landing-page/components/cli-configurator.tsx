import { Fragment, type JSX, useEffect, useId, useState } from "react"

import { Hourglass } from "lucide-react"
import { AnimatePresence, animate, useMotionValue, useTransform } from "motion/react"
import * as m from "motion/react-m"
import type { ToggleButtonGroupProps } from "react-aria-components"
import { useTranslations } from "use-intl/react"

import { EXP, EXP_FAST } from "~/src/integrations/motion/motion.tokens"

import {
  CLI_CHOICES,
  CLI_EXTRAS,
  CLI_GENERATION_VALUES,
  CLI_GROUPS,
  CLI_MODULES,
  CLI_TEMPLATE_SUPPORT,
  type CliAnswers,
  type CliOption,
  NONE,
  PACKAGE_MANAGERS,
  SCAFFOLD_DIR,
  SCAFFOLD_TARGET,
  cliFlags,
  isCliOptionAvailable,
  isCliOptionSelectable,
  resolveCliAnswers,
} from "~/src/data/cli"

import { cn } from "~/src/lib/cn"

import { ToggleGroup, ToggleGroupItem } from "~/src/presentation/components/shadcn/toggle-group"

import { CopyButton } from "~/src/presentation/components/custom/copy-button"
import { RunnerTabs } from "~/src/presentation/components/custom/landing-page/components/runner-tabs"

type CliExtra = (typeof CLI_EXTRAS)[number]

const EXTRAS_GROUP = "extras"

const ROW_ENTER = { opacity: 0, x: -8 }
const ROW_SETTLED = { opacity: 1, x: 0 }

const OPTION_CLASSNAME =
  "h-auto cursor-pointer gap-2 rounded-md border border-border px-3 py-1.5 text-body-sm font-normal text-muted-foreground transition-colors duration-200 ease-exp hover:border-muted-foreground/30 hover:bg-transparent hover:text-foreground data-pressed:bg-muted data-selected:border-transparent data-selected:bg-muted data-selected:text-foreground"

const keepExtras = (extras: readonly CliExtra[], answers: CliAnswers): readonly CliExtra[] =>
  extras.filter((extra) => isCliOptionSelectable(extra, CLI_TEMPLATE_SUPPORT.extras, answers))

const DEFAULT_STACK = resolveCliAnswers({}, CLI_TEMPLATE_SUPPORT.choices)

const ComingMark = (): JSX.Element => <Hourglass aria-hidden className="size-3.5 shrink-0" />

interface ChoiceRowProps extends Pick<ToggleButtonGroupProps, "disallowEmptySelection" | "onSelectionChange" | "selectionMode"> {
  readonly answers: CliAnswers
  readonly choiceId: string
  readonly comingId: string
  readonly options: readonly CliOption[]
  readonly picked: readonly CliOption[]
  readonly supported: readonly string[]
}

const ChoiceRow = ({ answers, choiceId, comingId, options, picked, supported, ...selection }: ChoiceRowProps): JSX.Element => {
  const t = useTranslations("pages.landing.cli")
  const labelId = useId()
  const noteId = useId()

  return (
    <div className="grid gap-x-5 gap-y-3 px-5 py-3.5 md:grid-cols-[7.5rem_1fr] md:items-baseline md:px-7 md:py-4">
      <dt className="font-mono text-label text-muted-foreground uppercase" id={labelId}>
        {t(`choices.${choiceId}.label`)}
      </dt>
      <dd className="grid gap-3">
        <ToggleGroup aria-labelledby={labelId} className="flex-wrap gap-2.5" selectedKeys={picked.map(({ id }) => id)} {...selection}>
          {options.map((option) => {
            const isComing = !supported.includes(option.id)
            const isRuledOut = !isCliOptionAvailable(option, answers)
            const describedBy = [isComing && comingId, isRuledOut && noteId].filter((id) => id !== false).join(" ")

            return (
              <ToggleGroupItem
                className={cn(OPTION_CLASSNAME, { "line-through": isRuledOut })}
                id={option.id}
                isDisabled={isComing || isRuledOut}
                key={option.id}
                {...(describedBy !== "" && { "aria-describedby": describedBy })}
              >
                {t(`choices.${choiceId}.options.${option.id}`)}
                {isComing && <ComingMark />}
              </ToggleGroupItem>
            )
          })}
        </ToggleGroup>
        {options.some(({ unavailableWhen }) => unavailableWhen !== undefined) && (
          <p className="text-body-sm text-pretty text-muted-foreground" id={noteId}>
            {t(`choices.${choiceId}.note`)}
          </p>
        )}
      </dd>
    </div>
  )
}

const PaneLabel = ({ children }: Readonly<{ children: string }>): JSX.Element => (
  <span className="font-mono text-label text-muted-foreground uppercase">{children}</span>
)

const CommandBlock = ({ lines }: Readonly<{ lines: readonly string[] }>): JSX.Element => {
  const t = useTranslations("pages.landing.cli")

  return (
    <div className="flex-1 px-5 py-6 md:px-7 md:py-7">
      <div className="flex items-center justify-between gap-4">
        <PaneLabel>{t("commandLabel")}</PaneLabel>
        <CopyButton copiedLabel={t("copied")} copyLabel={t("copy")} value={lines.join(" \\\n  ")} />
      </div>
      <code className="mt-4 block font-mono text-spec leading-relaxed">
        <span aria-hidden className="mr-2 text-muted-foreground/50 select-none">
          $
        </span>
        {lines.map((line, index) => (
          <span
            className={cn("whitespace-pre-wrap", { "block pl-6 text-muted-foreground": index > 0, "text-foreground": index <= 0 })}
            key={line}
          >
            {line}
            {index < lines.length - 1 ? " \\" : ""}
          </span>
        ))}
      </code>
    </div>
  )
}

const RunCount = ({ value }: Readonly<{ value: number }>): JSX.Element => {
  const count = useMotionValue(value)
  const rounded = useTransform(count, (current) => String(Math.round(current)))

  useEffect(() => {
    const controls = animate(count, value, EXP)
    return () => {
      controls.stop()
    }
  }, [count, value])

  return <m.span className="font-mono tabular-nums">{rounded}</m.span>
}

const RunOutput = ({ modules }: Readonly<{ modules: readonly string[] }>): JSX.Element => {
  const t = useTranslations("pages.landing.cli")

  return (
    <div className="w-full flex-1 px-5 py-6 md:px-7 md:py-7">
      <PaneLabel>{t("run.label")}</PaneLabel>

      <ul className="mt-4 grid w-fit grid-cols-2 gap-x-14 gap-y-3 font-mono text-spec text-muted-foreground">
        <AnimatePresence initial={false} mode="popLayout">
          {modules.map((name) => (
            <m.li
              animate={ROW_SETTLED}
              className="flex items-center gap-3"
              exit={ROW_ENTER}
              initial={ROW_ENTER}
              key={name}
              layout
              transition={EXP}
            >
              <span aria-hidden className="text-ring">
                ✓
              </span>
              {name}
            </m.li>
          ))}
        </AnimatePresence>
      </ul>
      <m.p className="mt-8 flex items-center gap-3 border-t border-border pt-6 text-body-sm text-foreground" layout transition={EXP_FAST}>
        <span aria-hidden className="size-1.25 shrink-0 rounded-xs bg-ring" />
        <span>
          <RunCount value={modules.length} /> {t("run.modules")} · {t("run.green")}
        </span>
      </m.p>
    </div>
  )
}

const NextSteps = ({ dev }: Readonly<{ dev: string }>): JSX.Element => {
  const t = useTranslations("pages.landing.cli")

  return (
    <div className="w-full flex-1 px-5 py-6 md:px-7 md:py-7">
      <PaneLabel>{t("nextLabel")}</PaneLabel>
      <code className="mt-4 block font-mono text-spec leading-relaxed text-muted-foreground">
        <span className="block">
          <span aria-hidden className="mr-2 text-muted-foreground/50 select-none">
            $
          </span>
          cd {SCAFFOLD_DIR}
        </span>
        <span className="block">
          <span aria-hidden className="mr-2 text-muted-foreground/50 select-none">
            $
          </span>
          {dev}
        </span>
        <span className="mt-2 block text-muted-foreground">
          <span aria-hidden className="mr-2 select-none">
            →
          </span>
          http://localhost:3000
        </span>
      </code>
    </div>
  )
}

export const CliConfigurator = (): JSX.Element => {
  const t = useTranslations("pages.landing.cli")
  const comingId = useId()
  const [answers, setAnswers] = useState<CliAnswers>(DEFAULT_STACK)
  const [extras, setExtras] = useState<readonly CliExtra[]>([])
  const [runner, setRunner] = useState<(typeof PACKAGE_MANAGERS)[number]>(PACKAGE_MANAGERS[0])

  const rows = CLI_CHOICES.map((choice) => ({ choice, picked: choice.options.filter((option) => option.id === answers[choice.id]) }))
  const lines = [`${runner.exec} ${SCAFFOLD_TARGET}`, ...cliFlags(answers), ...extras.map((extra) => extra.flag)]
  const modules = [
    ...CLI_MODULES.filter((module) => !("choiceId" in module) || answers[module.choiceId] !== NONE).map((module) => module.id),
    ...extras.map((extra) => extra.module),
  ]

  const select = (choiceId: string, optionId: string): void => {
    const next = resolveCliAnswers({ ...answers, [choiceId]: optionId }, CLI_TEMPLATE_SUPPORT.choices)
    setAnswers(next)
    setExtras(keepExtras(extras, next))
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <div className="flex flex-wrap items-center gap-x-6 border-b border-border bg-card px-3 md:px-5">
        <RunnerTabs className="w-auto border-b-0 py-2" onSelect={setRunner} taken={runner.id} />
        <p className="flex items-center gap-2 px-2.5 pb-2.5 text-body-sm text-muted-foreground md:ml-auto md:pb-0">
          <ComingMark />
          <span id={comingId}>{t("coming")}</span>
        </p>
      </div>

      <div className="grid divide-y divide-border lg:grid-cols-[1.45fr_1fr] lg:divide-x lg:divide-y-0">
        <div className="divide-y divide-border">
          {CLI_GROUPS.map((group) => (
            <Fragment key={group}>
              <div className="bg-muted/25 px-5 py-2 font-mono text-label text-muted-foreground uppercase md:px-7">
                {t(`groups.${group}`)}
              </div>
              <dl className="divide-y divide-border">
                {rows
                  .filter(({ choice }) => choice.group === group)
                  .map(({ choice, picked }) => (
                    <ChoiceRow
                      answers={answers}
                      choiceId={choice.id}
                      comingId={comingId}
                      disallowEmptySelection
                      key={choice.id}
                      onSelectionChange={(keys) => {
                        for (const option of choice.options) {
                          if (keys.has(option.id)) {
                            select(choice.id, option.id)
                          }
                        }
                      }}
                      options={choice.options}
                      picked={picked}
                      selectionMode="single"
                      supported={CLI_TEMPLATE_SUPPORT.choices[choice.id]}
                    />
                  ))}
                {group === EXTRAS_GROUP && (
                  <ChoiceRow
                    answers={answers}
                    choiceId={EXTRAS_GROUP}
                    comingId={comingId}
                    onSelectionChange={(keys) => {
                      setExtras(
                        keepExtras(
                          CLI_EXTRAS.filter((extra) => keys.has(extra.id)),
                          answers,
                        ),
                      )
                    }}
                    options={CLI_EXTRAS}
                    picked={extras}
                    selectionMode="multiple"
                    supported={CLI_TEMPLATE_SUPPORT.extras}
                  />
                )}
              </dl>
            </Fragment>
          ))}
        </div>

        <div className="flex flex-col divide-y divide-border bg-card">
          <CommandBlock lines={lines} />
          <RunOutput modules={modules} />
          <NextSteps dev={runner.dev} />
        </div>
      </div>

      <div className="flex flex-col gap-2 border-t border-border bg-card px-5 py-4 text-body-sm text-pretty text-muted-foreground md:px-7">
        <p className="text-foreground">{t("generates", CLI_GENERATION_VALUES)}</p>
        <p>{t("choicesLabel")}</p>
      </div>
    </div>
  )
}
