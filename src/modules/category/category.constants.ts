export const CATEGORY_NAME_MAX_LENGTH = 255

export const CATEGORY_ICON = {
  ARCHIVE: "Archive",
  FOLDER_OPEN: "FolderOpen",
  PUZZLE: "Puzzle",
} as const

export const CATEGORY_KIND = {
  CATEGORY: "category",
  COLLECTION: "collection",
} as const

export const CATEGORY_VISIBILITY = {
  HIDDEN: "hidden",
  PUBLIC: "public",
} as const

export const CATEGORY_QUERY_KEYS = {
  ALL: ["category"],
  LIST: ["category", "getCategories"],
} as const

export const CATEGORY_MUTATION_KEYS = {
  CREATE: ["category", "createCategory"],
  DELETE: ["category", "deleteCategory"],
  UPDATE: ["category", "updateCategory"],
} as const
