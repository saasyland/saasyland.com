export const selectedOption = <TOption extends string>(options: readonly TOption[], key: unknown): TOption | undefined =>
  options.find((option) => option === key)
