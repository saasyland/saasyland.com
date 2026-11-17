import { Fragment, type JSX, useEffect, useId, useState } from "react"

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
  NONE,
  PACKAGE_MANAGERS,
  SCAFFOLD_DIR,
  SCAFFOLD_TARGET,
} from "~/src/data/cli"

import { cn } from "~/src/lib/cn"

import { ToggleGroup, ToggleGroupItem } from "~/src/presentation/components/shadcn/toggle-group"

import { CopyButton } from "~/src/presentation/components/custom/copy-button"
import { RunnerTabs } from "~/src/presentation/components/custom/landing-page/components/runner-tabs"

type Answers = Readonly<Record<string, string>>

type CliExtra = (typeof CLI_EXTRAS)[number]

interface CliOption {
  readonly id: string
  readonly unavailableWhen?: Readonly<Record<string, readonly string[]>> | undefined
}

const EXTRAS_GROUP = "extras"

const ROW_ENTER = { opacity: 0, x: -8 }
const ROW_SETTLED = { opacity: 1, x: 0 }

const OPTION_CLASSNAME =
  "h-auto cursor-pointer gap-2 rounded-md border border-border px-3 py-1.5 text-body-sm font-normal text-muted-foreground transition-colors duration-200 ease-exp hover:border-muted-foreground/30 hover:bg-transparent hover:text-foreground data-pressed:bg-muted data-selected:border-transparent data-selected:bg-muted data-selected:text-foreground data-disabled:line-through"

const isAvailable = (option: CliOption, answers: Answers): boolean =>
  !Object.entries(option.unavailableWhen ?? {}).some(([choiceId, blocked]) => blocked.some((optionId) => optionId === answers[choiceId]))

const reconcile = (answers: Answers): Answers => {
  const next: Record<string, string> = {}
  for (const choice of CLI_CHOICES) {
    const legal = choice.options.filter((option) => isAvailable(option, next))
    const kept = legal.find((option) => option.id === answers[choice.id]) ?? legal[0]
    if (kept !== undefined) {
      next[choice.id] = kept.id
    }
  }
  return next
}

const DEFAULT_STACK = reconcile({})

const SupportedMark = (): JSX.Element => <span aria-hidden className="inline-block size-1.25 shrink-0 rounded-xs bg-ring align-middle" />

const LEGEND_VALUES = { ...CLI_GENERATION_VALUES, mark: () => <SupportedMark /> }

interface ChoiceRowProps extends Pick<ToggleButtonGroupProps, "disallowEmptySelection" | "onSelectionChange" | "selectionMode"> {
  readonly answers: Answers
  readonly choiceId: string
  readonly legendId: string
  readonly options: readonly CliOption[]
  readonly picked: readonly CliOption[]
  readonly supported: readonly string[]
}

const ChoiceRow = ({ answers, choiceId, legendId, options, picked, supported, ...selection }: ChoiceRowProps): JSX.Element => {
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
            const isSupported = supported.includes(option.id)
            const isDisabled = !isAvailable(option, answers)
            const describedBy = [isSupported && legendId, isDisabled && noteId].filter((id) => id !== false).join(" ")

            return (
              <ToggleGroupItem
                className={OPTION_CLASSNAME}
                id={option.id}
                isDisabled={isDisabled}
                key={option.id}
                {...(describedBy !== "" && { "aria-describedby": describedBy })}
              >
                {isSupported && <SupportedMark />}
                {t(`choices.${choiceId}.options.${option.id}`)}
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
  const legendId = useId()
  const [answers, setAnswers] = useState<Answers>(DEFAULT_STACK)
  const [extras, setExtras] = useState<readonly CliExtra[]>([])
  const [runner, setRunner] = useState<(typeof PACKAGE_MANAGERS)[number]>(PACKAGE_MANAGERS[0])

  const rows = CLI_CHOICES.map((choice) => ({ choice, picked: choice.options.filter((option) => option.id === answers[choice.id]) }))
  const lines = [
    `${runner.exec} ${SCAFFOLD_TARGET}`,
    ...rows.flatMap(({ picked }) => picked.map((option) => option.flag)),
    ...extras.map((extra) => extra.flag),
  ]
  const modules = [
    ...CLI_MODULES.filter((module) => !("choiceId" in module) || answers[module.choiceId] !== NONE).map((module) => module.id),
    ...extras.map((extra) => extra.module),
  ]

  const select = (choiceId: string, optionId: string): void => {
    const next = reconcile({ ...answers, [choiceId]: optionId })
    setAnswers(next)
    setExtras(extras.filter((extra) => isAvailable(extra, next)))
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <RunnerTabs className="bg-card px-3 py-2 md:px-5" onSelect={setRunner} taken={runner.id} />

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
                      disallowEmptySelection
                      key={choice.id}
                      legendId={legendId}
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
                    legendId={legendId}
                    onSelectionChange={(keys) => {
                      setExtras(CLI_EXTRAS.filter((extra) => keys.has(extra.id)))
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
        <p className="text-foreground" id={legendId}>
          {t.rich("defaultStack", LEGEND_VALUES)}
        </p>
        <p>{t("choicesLabel")}</p>
      </div>
    </div>
  )
}
