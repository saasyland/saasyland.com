import { Fragment, type JSX, type ReactNode, useEffect, useState } from "react"

import { AnimatePresence, animate, useMotionValue, useTransform } from "motion/react"
import * as m from "motion/react-m"
import { useTranslations } from "use-intl/react"

import { EXP, EXP_FAST, PRESS, TAP } from "~/src/integrations/motion/motion.tokens"

import { CLI_CHOICES, CLI_EXTRAS, CLI_GROUPS, CLI_MODULES, NONE, PACKAGE_MANAGERS, SCAFFOLD_DIR, SCAFFOLD_TARGET } from "~/src/data/cli"

import { cn } from "~/src/lib/cn"

import { CopyButton } from "~/src/presentation/components/custom/copy-button"
import { RunnerTabs } from "~/src/presentation/components/custom/landing-page/components/runner-tabs"

type Taken = Readonly<Record<string, string>>

interface ChoiceOption {
  readonly id: string
  readonly unavailableWhen?: Readonly<Record<string, readonly string[]>> | undefined
  readonly visibleWhen?: Readonly<Record<string, readonly string[]>> | undefined
}

const EXTRAS_GROUP = "extras"

const LAST_LINE_OFFSET = 1

const ROW_ENTER = { opacity: 0, x: -8 }
const ROW_SETTLED = { opacity: 1, x: 0 }

const CHIP_CLASSNAME =
  "inline-flex items-center rounded-md border px-3 py-1.5 text-body-sm transition-colors duration-200 ease-exp focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"

const isUnavailable = (option: ChoiceOption, taken: Taken): boolean =>
  Object.entries(option.unavailableWhen ?? {}).some(([choiceId, blocked]) => blocked.some((optionId) => optionId === taken[choiceId]))

const isVisible = (option: ChoiceOption, taken: Taken): boolean =>
  Object.entries(option.visibleWhen ?? {}).every(([choiceId, allowed]) => allowed.some((optionId) => optionId === taken[choiceId]))

const reconcile = (taken: Taken): Taken => {
  const next: Record<string, string> = { ...taken }
  for (const choice of CLI_CHOICES) {
    const current: ChoiceOption | undefined = choice.options.find((option) => option.id === next[choice.id])
    const isLegal = current !== undefined && isVisible(current, next) && !isUnavailable(current, next)
    if (!isLegal) {
      const fallback: ChoiceOption | undefined = choice.options.find((option) => isVisible(option, next) && !isUnavailable(option, next))
      if (fallback) {
        next[choice.id] = fallback.id
      }
    }
  }
  return next
}

interface ChipProps {
  readonly choiceId: string
  readonly isBlocked: boolean
  readonly isPressed: boolean
  readonly onPress: () => void
  readonly optionId: string
}

const Chip = ({ choiceId, isBlocked, isPressed, onPress, optionId }: ChipProps): JSX.Element => {
  const t = useTranslations("pages.landing.cli")
  const label = t(`choices.${choiceId}.options.${optionId}`)

  if (isBlocked) {
    return (
      <button
        className={cn(CHIP_CLASSNAME, "cursor-not-allowed border-border/40 text-muted-foreground/40")}
        disabled
        title={t(`choices.${choiceId}.unavailable.${optionId}`)}
        type="button"
      >
        <span className="line-through decoration-muted-foreground/30">{label}</span>
      </button>
    )
  }

  return (
    <m.button
      aria-pressed={isPressed}
      className={cn(CHIP_CLASSNAME, "cursor-pointer", {
        "border-border text-muted-foreground hover:border-muted-foreground/30 hover:text-foreground": !isPressed,
        "border-transparent bg-muted font-medium text-foreground": isPressed,
      })}
      onClick={onPress}
      transition={PRESS}
      type="button"
      whileTap={TAP}
    >
      {label}
    </m.button>
  )
}

const ChoiceRow = ({ children, choiceId }: Readonly<{ children: ReactNode; choiceId: string }>): JSX.Element => {
  const t = useTranslations("pages.landing.cli")

  return (
    <div className="grid gap-x-5 gap-y-3 px-5 py-3.5 md:grid-cols-[7.5rem_1fr] md:items-center md:px-7 md:py-4">
      <dt className="font-mono text-label text-muted-foreground uppercase">{t(`choices.${choiceId}.label`)}</dt>
      <dd className="flex flex-wrap items-center gap-2.5">{children}</dd>
    </div>
  )
}

const PaneLabel = ({ children }: Readonly<{ children: string }>): JSX.Element => (
  <span className="font-mono text-label text-muted-foreground/70 uppercase">{children}</span>
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
            {index < lines.length - LAST_LINE_OFFSET ? " \\" : ""}
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
        <span className="mt-2 block text-muted-foreground/60">
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
  const [taken, setTaken] = useState<Taken>(() =>
    reconcile(Object.fromEntries(CLI_CHOICES.map((choice) => [choice.id, choice.options[0].id]))),
  )
  const [extras, setExtras] = useState<readonly string[]>([])
  const [runner, setRunner] = useState<(typeof PACKAGE_MANAGERS)[number]>(PACKAGE_MANAGERS[0])

  const shown = CLI_CHOICES.map(({ group, id, options }) => ({ group, id, options: options.filter((option) => isVisible(option, taken)) }))
  const picked = shown.flatMap(({ id, options }) => options.filter((option) => option.id === taken[id]))
  const added = CLI_EXTRAS.filter((extra) => extras.includes(extra.id) && !isUnavailable(extra, taken))
  const lines = [`${runner.exec} ${SCAFFOLD_TARGET}`, ...picked.map((option) => option.flag), ...added.map((extra) => extra.flag)]
  const modules = [
    ...CLI_MODULES.filter((module) => !("choiceId" in module) || taken[module.choiceId] !== NONE).map((module) => module.id),
    ...added.map((extra) => extra.module),
  ]

  const select = (choiceId: string, optionId: string): void => {
    setTaken((current) => reconcile({ ...current, [choiceId]: optionId }))
  }

  const toggle = (extraId: string): void => {
    setExtras((current) => (current.includes(extraId) ? current.filter((id) => id !== extraId) : [...current, extraId]))
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border">
      <RunnerTabs className="bg-card px-3 py-2 md:px-5" onSelect={setRunner} taken={runner.id} />

      <div className="grid divide-y divide-border lg:grid-cols-[1.45fr_1fr] lg:divide-x lg:divide-y-0">
        <div className="divide-y divide-border">
          {CLI_GROUPS.map((group) => (
            <Fragment key={group}>
              <div className="bg-muted/25 px-5 py-2 font-mono text-label text-muted-foreground/70 uppercase md:px-7">
                {t(`groups.${group}`)}
              </div>
              <dl className="divide-y divide-border">
                {shown
                  .filter((choice) => choice.group === group && choice.options.length > 0)
                  .map((choice) => (
                    <ChoiceRow choiceId={choice.id} key={choice.id}>
                      {choice.options.map((option) => (
                        <Chip
                          choiceId={choice.id}
                          isBlocked={isUnavailable(option, taken)}
                          isPressed={taken[choice.id] === option.id}
                          key={option.id}
                          onPress={() => {
                            select(choice.id, option.id)
                          }}
                          optionId={option.id}
                        />
                      ))}
                    </ChoiceRow>
                  ))}
                {group === EXTRAS_GROUP && (
                  <ChoiceRow choiceId={EXTRAS_GROUP}>
                    {CLI_EXTRAS.map((extra) => (
                      <Chip
                        choiceId={EXTRAS_GROUP}
                        isBlocked={isUnavailable(extra, taken)}
                        isPressed={extras.includes(extra.id)}
                        key={extra.id}
                        onPress={() => {
                          toggle(extra.id)
                        }}
                        optionId={extra.id}
                      />
                    ))}
                  </ChoiceRow>
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

      <p className="border-t border-border bg-card px-5 py-4 text-body-sm text-pretty text-muted-foreground md:px-7">{t("choicesLabel")}</p>
    </div>
  )
}
