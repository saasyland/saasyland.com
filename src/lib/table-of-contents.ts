export interface Span {
  readonly height: number
  readonly top: number
}

export interface ReadingLayout {
  readonly entries: readonly Span[]
  readonly glide: number
  readonly headings: readonly number[]
  readonly line: number
}

export interface ReadingFrame {
  readonly active: number
  readonly thumb: Span
}

const clampUnit = (value: number): number => Math.min(Math.max(value, 0), 1)

const mix = (from: number, to: number, progress: number): number => from + (to - from) * progress

export const readingFrame = ({ entries, glide, headings, line }: ReadingLayout, scroll: number, glides: boolean): ReadingFrame => {
  const position = scroll + line
  const next = headings.filter((top) => top <= position).length
  const active = next - 1
  const current = entries[active] ?? { height: 0, top: entries[0]?.top ?? 0 }
  const upcoming = entries[next]
  const arrival = headings[next]

  if (!glides || upcoming === undefined || arrival === undefined) {
    return { active, thumb: current }
  }

  const departure = Math.max(headings[active] ?? line, arrival - glide)
  const progress = clampUnit((position - departure) / (arrival - departure))

  return {
    active,
    thumb: { height: mix(current.height, upcoming.height, progress), top: mix(current.top, upcoming.top, progress) },
  }
}
