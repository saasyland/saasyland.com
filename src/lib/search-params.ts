import * as zod from "zod"

export const searchParam = <Schema extends zod.ZodType>(schema: Schema): zod.ZodCatch<zod.ZodOptional<Schema>> =>
  schema.optional().catch(undefined)

export const searchText = (): zod.ZodCatch<zod.ZodOptional<zod.ZodString>> => searchParam(zod.string().nonempty())

export const searchFlag = (): zod.ZodCatch<zod.ZodOptional<zod.ZodBoolean>> => searchParam(zod.boolean())

export const searchChoice = <const Choice extends string>(
  choices: readonly [Choice, ...Choice[]],
  fallback: NoInfer<Choice>,
): zod.ZodCatch<zod.ZodDefault<zod.ZodEnum<{ [Key in Choice]: Key }>>> => zod.enum(choices).default(fallback).catch(fallback)
