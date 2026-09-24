const jsonNullValue: unknown = JSON.parse("null")

if (jsonNullValue !== null) {
  throw new Error("Expected JSON null")
}

export const JSON_NULL: null = jsonNullValue

export const readJsonNull = (): null => JSON_NULL
