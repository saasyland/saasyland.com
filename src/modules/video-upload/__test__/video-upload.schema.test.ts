import { createTableRelationsHelpers, extractTablesRelationalConfig, getTableName } from "drizzle-orm"
import { getTableConfig } from "drizzle-orm/sqlite-core"
import { describe, expect, it } from "vite-plus/test"

import { lesson } from "~/src/modules/lesson/lesson.schema"
import { videoUpload, videoUploadRelations } from "~/src/modules/video-upload/video-upload.schema"

describe("video upload schema", () => {
  it("belongs to its lesson and goes with it", () => {
    const parents = getTableConfig(videoUpload).foreignKeys.map((key) => [getTableName(key.reference().foreignTable), key.onDelete])

    expect(parents).toStrictEqual([["lesson", "cascade"]])
  })

  it("relates the upload to its lesson", () => {
    const { tables } = extractTablesRelationalConfig({ lesson, videoUpload, videoUploadRelations }, createTableRelationsHelpers)

    expect(Object.keys(tables["videoUpload"]?.relations ?? {})).toStrictEqual(["lesson"])
  })

  it("stamps every update", () => {
    expect(videoUpload.updatedAt.onUpdateFn?.()).toBeInstanceOf(Date)
  })
})
