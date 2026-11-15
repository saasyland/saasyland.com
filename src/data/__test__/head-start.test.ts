import { describe, expect, it } from "vite-plus/test"

import {
  HEAD_START_CLAIM_MAX_HOURS,
  HEAD_START_HIGH_HOURS,
  HEAD_START_HOURS,
  HEAD_START_LAYER,
  HEAD_START_LOW_HOURS,
  HEAD_START_ROUNDING_HOURS,
  HEAD_START_ROWS,
} from "~/src/data/head-start"
import { REPOSITORY_FACTS } from "~/src/data/repository-facts"

import blogMessages from "~/messages/en-US/pages.blog.json"

describe("the head start", () => {
  it("itemises each part of the default project once, with a layer and a low estimate below the high one", () => {
    expect(new Set(HEAD_START_ROWS.map(({ id }) => id)).size).toBe(HEAD_START_ROWS.length)
    for (const { high, layers, low } of HEAD_START_ROWS) {
      expect(layers.length).toBeGreaterThan(0)
      expect(layers.every((layer) => Object.values(HEAD_START_LAYER).includes(layer))).toBe(true)
      expect(low).toBeGreaterThan(0)
      expect(high).toBeGreaterThan(low)
    }
    expect(Object.keys(blogMessages.headStart.rows).toSorted()).toStrictEqual(HEAD_START_ROWS.map(({ id }) => id).toSorted())
  })

  it("adds the rows up, and claims no more than the low total supports or the site ever claimed", () => {
    expect(HEAD_START_LOW_HOURS).toBe(HEAD_START_ROWS.reduce((total, { low }) => total + low, 0))
    expect(HEAD_START_HIGH_HOURS).toBe(HEAD_START_ROWS.reduce((total, { high }) => total + high, 0))
    expect(HEAD_START_HOURS).toBeLessThanOrEqual(HEAD_START_LOW_HOURS)
    expect(HEAD_START_HOURS).toBeLessThanOrEqual(HEAD_START_CLAIM_MAX_HOURS)
    expect(HEAD_START_HOURS % HEAD_START_ROUNDING_HOURS).toBe(0)
    expect(REPOSITORY_FACTS).toMatchObject({
      headStartHighHours: HEAD_START_HIGH_HOURS,
      headStartHours: HEAD_START_HOURS,
      headStartLowHours: HEAD_START_LOW_HOURS,
    })
  })
})
