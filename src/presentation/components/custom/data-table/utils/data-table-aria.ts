export type SortDirection = false | "asc" | "desc"

export const ariaSort = (sorted: SortDirection): "ascending" | "descending" | "none" => {
  if (sorted === "asc") {
    return "ascending"
  }

  return sorted === "desc" ? "descending" : "none"
}
