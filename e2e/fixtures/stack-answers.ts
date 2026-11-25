import { CHOICE_GROUP, STACK_CHOICES, STACK_DEFAULTS, STACK_EXTRAS, isOptionAvailable, isOptionLegal, stackZodSchemas } from "@saasyland/stack"
import type * as zod from "zod"

type Answers = zod.output<typeof stackZodSchemas.answers>

type Selection = Readonly<Record<string, string>>

interface Wanted {
  readonly choice?: string
  readonly extra?: string
  readonly option?: string
}

const DEFAULTS: Readonly<Record<string, unknown>> = STACK_DEFAULTS

const defaultFirst = <Option extends { readonly id: string }>(choiceId: string, options: readonly Option[]): Option[] =>
  options.toSorted((first, second) => Number(second.id === DEFAULTS[choiceId]) - Number(first.id === DEFAULTS[choiceId]))

function* completions(selection: Selection, index: number, wanted: Wanted): Generator<Answers> {
  const choice = STACK_CHOICES[index]

  if (choice === undefined) {
    const extras = STACK_EXTRAS.filter(({ id }) => id === wanted.extra).filter((extra) => isOptionAvailable(extra, selection))
    const answers = stackZodSchemas.answers.safeParse({ ...selection, [CHOICE_GROUP.EXTRAS]: extras.map(({ id }) => id) })

    if (answers.success && extras.length === Number(wanted.extra !== undefined)) {
      yield answers.data
    }
    return
  }

  const legal = choice.options.filter((option) => isOptionLegal(option, selection))

  if (legal.length === 0) {
    yield* completions(selection, index + 1, wanted)
    return
  }

  const candidates = choice.id === wanted.choice ? legal.filter(({ id }) => id === wanted.option) : defaultFirst(choice.id, legal)

  for (const option of candidates) {
    yield* completions({ ...selection, [choice.id]: option.id }, index + 1, wanted)
  }
}

const answersWith = (wanted: Wanted): Answers => {
  const [answers] = completions({}, 0, wanted)

  if (answers === undefined) {
    throw new Error(`No legal answers choose ${JSON.stringify(wanted)}`)
  }

  return answers
}

export const EVERY_STACK_ANSWER: readonly Answers[] = [
  ...STACK_CHOICES.flatMap((choice) => choice.options.map((option) => answersWith({ choice: choice.id, option: option.id }))),
  ...STACK_EXTRAS.map(({ id }) => answersWith({ extra: id })),
]
