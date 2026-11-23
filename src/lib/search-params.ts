import type { SearchMiddleware } from "@tanstack/react-router"
import zod from "zod/v4"

export const searchParam = <Schema extends zod.ZodType>(schema: Schema): zod.ZodCatch<zod.ZodOptional<Schema>> =>
  schema.optional().catch(undefined)

export const searchText = (): zod.ZodCatch<zod.ZodOptional<zod.ZodString>> => searchParam(zod.string().nonempty())

export const searchFlag = (): zod.ZodCatch<zod.ZodOptional<zod.ZodBoolean>> => searchParam(zod.boolean())

export const searchChoice = <const Choice extends string>(
  choices: readonly [Choice, ...Choice[]],
  fallback: NoInfer<Choice>,
): zod.ZodCatch<zod.ZodDefault<zod.ZodEnum<{ [Key in Choice]: Key }>>> => zod.enum(choices).default(fallback).catch(fallback)

export const onlyDeclaredSearch =
  <Search extends object>({ shape }: zod.ZodObject): SearchMiddleware<Search> =>
  ({ next, search }) => {
    const declared = { ...next(search) }

    for (const param of Object.keys(declared)) {
      if (!Object.hasOwn(shape, param)) {
        Reflect.deleteProperty(declared, param)
      }
    }

    return declared
  }
