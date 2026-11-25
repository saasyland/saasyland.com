export const DATA_GRID_ACTIONS_SIZE = 56

export const DATA_GRID_DATE_PRESETS = [
  { name: "last7Days", span: { days: 7 } },
  { name: "last30Days", span: { days: 30 } },
  { name: "last12Months", span: { months: 12 } },
] as const
