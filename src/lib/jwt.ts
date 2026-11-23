import type * as zod from "zod"

const PAYLOAD_SEGMENT = 1

const decodeSegment = (segment: string): unknown[] => {
  try {
    return [JSON.parse(atob(segment.replaceAll("-", "+").replaceAll("_", "/")))]
  } catch {
    return []
  }
}

export const readUnverifiedJwtPayload = <Schema extends zod.ZodType>(token: string, schema: Schema): zod.output<Schema> | undefined => {
  const [payload] = decodeSegment(token.split(".")[PAYLOAD_SEGMENT] ?? "")

  return schema.safeParse(payload).data
}
