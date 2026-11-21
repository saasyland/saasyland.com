export const COURSE_COVER_SIZE = { height: 900, width: 1600 } as const

const COURSE_COVER_SMALL_WIDTH = 480
const COURSE_COVER_MEDIUM_WIDTH = 960

const COURSE_COVER_WIDTHS = [COURSE_COVER_SMALL_WIDTH, COURSE_COVER_MEDIUM_WIDTH, COURSE_COVER_SIZE.width] as const

const COURSE_COVERS_PATH = "/images/courses"

const COVERED_COURSES = {
  "build-a-feedback-board": "buildAFeedbackBoard",
  "building-with-ai-agents": "buildingWithAiAgents",
  "code-walkthrough": "codeWalkthrough",
  "empty-folder-to-production": "emptyFolderToProduction",
  "selling-software-in-the-eu": "sellingSoftwareInTheEu",
} as const

type CoveredSlug = keyof typeof COVERED_COURSES

export type CourseCoverAlt = (typeof COVERED_COURSES)[CoveredSlug]

export interface CourseCover {
  readonly alt: CourseCoverAlt
  readonly src: string
  readonly srcSet: string
}

const isCovered = (slug: string): slug is CoveredSlug => Object.hasOwn(COVERED_COURSES, slug)

const coverFile = (slug: CoveredSlug, width: number): string =>
  width === COURSE_COVER_SIZE.width ? `${COURSE_COVERS_PATH}/${slug}.webp` : `${COURSE_COVERS_PATH}/${slug}-${String(width)}.webp`

export const courseCover = (slug: string): CourseCover | undefined => {
  if (!isCovered(slug)) {
    return undefined
  }

  return {
    alt: COVERED_COURSES[slug],
    src: coverFile(slug, COURSE_COVER_SIZE.width),
    srcSet: COURSE_COVER_WIDTHS.map((width) => `${coverFile(slug, width)} ${String(width)}w`).join(", "),
  }
}
