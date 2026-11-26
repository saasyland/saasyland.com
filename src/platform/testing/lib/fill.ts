import type userEvent from "@testing-library/user-event"

export const fill = async (user: ReturnType<typeof userEvent.setup>, field: Element, text: string): Promise<void> => {
  await user.click(field)
  await user.paste(text)
}
