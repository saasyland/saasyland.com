export const textValueProps = (textValue: string | undefined, children: unknown): { readonly textValue?: string } => {
  if (textValue !== undefined) {
    return { textValue }
  }

  if (typeof children === "string") {
    return { textValue: children }
  }

  return {}
}
