export const selectTriggerNamed =
  (value: string): ((accessibleName: string) => boolean) =>
  (accessibleName) =>
    accessibleName.includes(value)
