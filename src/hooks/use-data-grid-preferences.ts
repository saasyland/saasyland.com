import { useSyncExternalStore } from "react"

import zod from "zod/v4"

import { DATA_GRID_DENSITIES, DATA_GRID_PIN } from "~/src/integrations/tanstack-table/table.features"

import { PAGE_SIZES } from "~/src/modules/_core/utils/pagination"

import { APP_DOMAIN } from "~/src/presentation/branding"

const STORAGE_PREFIX = `${APP_DOMAIN}:data-grid:v1:`

const columnIds = zod.array(zod.string())

const preferencesSchema = zod.object({
  columnOrder: columnIds.optional(),
  columnPinning: zod.object({ [DATA_GRID_PIN.END]: columnIds, [DATA_GRID_PIN.START]: columnIds }).optional(),
  columnSizing: zod.record(zod.string(), zod.number().positive()).optional(),
  columnVisibility: zod.record(zod.string(), zod.boolean()).optional(),
  density: zod.enum(DATA_GRID_DENSITIES).optional(),
  pageSize: zod.literal(PAGE_SIZES).optional(),
})

export type DataGridPreferences = zod.infer<typeof preferencesSchema>

const NO_PREFERENCES: DataGridPreferences = {}

interface StoredPreferences {
  readonly preferences: DataGridPreferences
  readonly raw: string
}

const stored = new Map<string, StoredPreferences>()

const refusedByTheBrowser = new Map<string, DataGridPreferences>()

const listeners = new Set<() => void>()

const storageKey = (id: string): string => `${STORAGE_PREFIX}${id}`

const parse = (raw: string): DataGridPreferences => {
  try {
    const parsed = preferencesSchema.safeParse(JSON.parse(raw))
    return parsed.success ? parsed.data : NO_PREFERENCES
  } catch {
    return NO_PREFERENCES
  }
}

const storedPreferences = (id: string): DataGridPreferences => {
  const raw = localStorage.getItem(storageKey(id))
  if (raw === null) {
    return NO_PREFERENCES
  }
  const known = stored.get(id)
  if (known?.raw === raw) {
    return known.preferences
  }
  const preferences = parse(raw)
  stored.set(id, { preferences, raw })
  return preferences
}

const preferencesOf = (id: string): DataGridPreferences => {
  const refused = refusedByTheBrowser.get(id)
  if (refused !== undefined) {
    return refused
  }
  try {
    return storedPreferences(id)
  } catch {
    return NO_PREFERENCES
  }
}

const save = (id: string, preferences: DataGridPreferences): void => {
  try {
    if (Object.keys(preferences).length === 0) {
      localStorage.removeItem(storageKey(id))
    } else {
      localStorage.setItem(storageKey(id), JSON.stringify(preferences))
    }
    refusedByTheBrowser.delete(id)
  } catch {
    refusedByTheBrowser.set(id, preferences)
  }
  for (const listener of listeners) {
    listener()
  }
}

const subscribe = (listener: () => void): (() => void) => {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const serverPreferences = (): DataGridPreferences => NO_PREFERENCES

export interface DataGridPreferencesState {
  readonly preferences: DataGridPreferences
  readonly reset: () => void
  readonly update: (change: DataGridPreferences) => void
}

export const useDataGridPreferences = (id: string): DataGridPreferencesState => {
  const preferences = useSyncExternalStore(subscribe, () => preferencesOf(id), serverPreferences)

  return {
    preferences,
    reset: () => {
      save(id, NO_PREFERENCES)
    },
    update: (change) => {
      save(id, { ...preferencesOf(id), ...change })
    },
  }
}
