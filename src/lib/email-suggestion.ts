import { EMAIL_DOMAINS } from "~/src/data/email-domains"

const EMAIL_SEPARATOR = "@"
const EMAIL_SUGGESTION_MAX_DISTANCE = 2
const CHARACTERS_PER_EDIT = 4
const TRANSPOSITION_SPAN = 2
const UNREACHABLE = Number.POSITIVE_INFINITY

const editDistance = (source: string, target: string): number => {
  const rows: number[][] = []

  const costAt = (row: number, column: number): number => rows[row]?.[column] ?? UNREACHABLE

  const cellCost = (row: number, column: number): number => {
    if (row === 0 && column === 0) {
      return 0
    }

    const sourceCharacter = source.charAt(row - 1)
    const targetCharacter = target.charAt(column - 1)
    const isTransposed =
      sourceCharacter === target.charAt(column - TRANSPOSITION_SPAN) && source.charAt(row - TRANSPOSITION_SPAN) === targetCharacter

    return Math.min(
      costAt(row - 1, column) + 1,
      costAt(row, column - 1) + 1,
      costAt(row - 1, column - 1) + (sourceCharacter === targetCharacter ? 0 : 1),
      isTransposed ? costAt(row - TRANSPOSITION_SPAN, column - TRANSPOSITION_SPAN) + 1 : UNREACHABLE,
    )
  }

  for (let row = 0; row <= source.length; row += 1) {
    const cells: number[] = []
    rows.push(cells)

    for (let column = 0; column <= target.length; column += 1) {
      cells.push(cellCost(row, column))
    }
  }

  return costAt(source.length, target.length)
}

const allowedDistance = (candidate: string): number =>
  Math.min(EMAIL_SUGGESTION_MAX_DISTANCE, Math.floor(candidate.length / CHARACTERS_PER_EDIT))

const closestDomain = (domain: string): string | undefined => {
  const [closest, runnerUp] = EMAIL_DOMAINS.filter(
    (candidate) => Math.abs(candidate.length - domain.length) <= EMAIL_SUGGESTION_MAX_DISTANCE,
  )
    .map((candidate) => ({ candidate, distance: editDistance(domain, candidate) }))
    .filter(({ candidate, distance }) => distance <= allowedDistance(candidate))
    .toSorted((left, right) => left.distance - right.distance)

  if (closest === undefined || closest.distance === runnerUp?.distance) {
    return undefined
  }

  return closest.candidate
}

export const suggestEmail = (email: string): string | undefined => {
  const separator = email.lastIndexOf(EMAIL_SEPARATOR)
  const local = email.slice(0, Math.max(separator, 0))
  const domain = email.slice(separator + 1).toLowerCase()

  if (local === "" || domain === "" || EMAIL_DOMAINS.includes(domain)) {
    return undefined
  }

  const closest = closestDomain(domain)

  return closest === undefined ? undefined : `${local}${EMAIL_SEPARATOR}${closest}`
}
