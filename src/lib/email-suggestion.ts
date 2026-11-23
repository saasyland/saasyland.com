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

interface Candidate {
  readonly distance: number
  readonly domain: string
}

const candidatesFor = (domain: string): Candidate[] =>
  EMAIL_DOMAINS.filter((candidate) => Math.abs(candidate.length - domain.length) <= EMAIL_SUGGESTION_MAX_DISTANCE)
    .map((candidate) => ({ distance: editDistance(domain, candidate), domain: candidate }))
    .filter((candidate) => candidate.distance <= allowedDistance(candidate.domain))

const isUniquelyClosest = (candidate: Candidate, candidates: readonly Candidate[]): boolean =>
  candidates.filter((other) => other.distance <= candidate.distance).length === 1

export const suggestEmail = (email: string): string | undefined => {
  const separator = email.lastIndexOf(EMAIL_SEPARATOR)
  const local = email.slice(0, Math.max(separator, 0))
  const domain = email.slice(separator + 1).toLowerCase()
  const isMisspelt = local !== "" && domain !== "" && !EMAIL_DOMAINS.includes(domain)
  const candidates = isMisspelt ? candidatesFor(domain) : []

  return candidates
    .filter((candidate) => isUniquelyClosest(candidate, candidates))
    .map((candidate) => `${local}${EMAIL_SEPARATOR}${candidate.domain}`)
    .at(0)
}
