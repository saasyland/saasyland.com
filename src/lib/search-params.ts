import * as zod from "zod"

export const searchText = (): zod.ZodCatch<zod.ZodOptional<zod.ZodString>> => zod.string().nonempty().optional().catch(undefined)

export const searchFlag = (): zod.ZodCatch<zod.ZodOptional<zod.ZodBoolean>> => zod.boolean().optional().catch(undefined)

export const searchChoice = <const Choice extends string>(
  choices: readonly [Choice, ...Choice[]],
  fallback: NoInfer<Choice>,
): zod.ZodCatch<zod.ZodDefault<zod.ZodEnum<{ [Key in Choice]: Key }>>> => zod.enum(choices).default(fallback).catch(fallback)
