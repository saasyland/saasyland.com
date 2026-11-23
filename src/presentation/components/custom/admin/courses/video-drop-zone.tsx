import { type JSX, useId, useState } from "react"

import { FileVideo } from "lucide-react"
import { DropZone, FileTrigger, isFileDropItem } from "react-aria-components"
import { useFormatter, useTranslations } from "use-intl/react"

import { COURSE_VALIDATION_PARAMS } from "~/src/modules/course/course.constants"
import {
  VIDEO_UPLOAD_ACCEPTED_TYPES,
  VIDEO_UPLOAD_FORMAT_NAMES,
  VIDEO_UPLOAD_MAX_GIGABYTES,
} from "~/src/modules/video-upload/video-upload.constants"
import { videoUploadZodSchemas } from "~/src/modules/video-upload/video-upload.zod"

import { cn } from "~/src/lib/cn"

import { Button } from "~/src/presentation/components/shadcn/button"

import { ValidationFieldError } from "~/src/presentation/components/custom/validation-field-error"

const fileSchema = videoUploadZodSchemas.startVideoUpload.pick({ fileName: true, sizeBytes: true })

interface VideoDropZoneProps {
  readonly isCompact?: boolean
  readonly isDisabled?: boolean
  readonly label: string
  readonly onFile: (file: File) => void
}

export const VideoDropZone = ({ isCompact = false, isDisabled = false, label, onFile }: VideoDropZoneProps): JSX.Element => {
  const t = useTranslations("pages.admin.courses.lessonEditor.video.drop")
  const format = useFormatter()
  const errorId = useId()
  const [error, setError] = useState<string>()

  const types = format.list(VIDEO_UPLOAD_FORMAT_NAMES, { type: "disjunction" })

  const choose = (file: File): void => {
    const parsed = fileSchema.safeParse({ fileName: file.name, sizeBytes: file.size })
    setError(parsed.error?.issues[0]?.message)
    if (parsed.success) {
      onFile(file)
    }
  }

  return (
    <div className="flex flex-col gap-2">
      <DropZone
        aria-label={label}
        {...(error === undefined ? {} : { "aria-describedby": errorId })}
        className={cn(
          "flex items-center justify-center gap-3 rounded-lg border border-dashed border-border bg-muted/30 transition-colors duration-200 ease-exp",
          { "flex-col px-6 py-8 text-center": !isCompact, "flex-wrap px-4 py-3": isCompact },
          "data-drop-target:border-ring data-drop-target:bg-ring/8 data-focus-visible:outline-2 data-focus-visible:outline-offset-2 data-focus-visible:outline-ring data-focus-visible:outline-solid",
          "data-disabled:opacity-60",
          { "border-destructive": error !== undefined },
        )}
        data-slot="video-drop-zone"
        getDropOperation={() => "copy"}
        isDisabled={isDisabled}
        onDrop={(event) => {
          const item = event.items.find((entry) => isFileDropItem(entry))
          void item?.getFile().then(choose)
        }}
      >
        {({ isDropTarget }) => (
          <>
            <span
              className={cn(
                "flex shrink-0 items-center justify-center rounded-full border border-border bg-background text-muted-foreground",
                {
                  "size-10": !isCompact,
                  "size-8": isCompact,
                },
              )}
            >
              <FileVideo aria-hidden className="size-5" strokeWidth={1.75} />
            </span>
            <p className={cn("text-sm font-medium text-pretty text-foreground", { "min-w-0 flex-1": isCompact })}>
              {isDropTarget ? t("release") : t("title")}
            </p>
            <FileTrigger
              acceptedFileTypes={VIDEO_UPLOAD_ACCEPTED_TYPES}
              onSelect={(files) => {
                const file = files?.[0]
                if (file !== undefined) {
                  choose(file)
                }
              }}
            >
              <Button isDisabled={isDisabled} size="sm" variant="outline">
                {t("choose")}
              </Button>
            </FileTrigger>
            <p className={cn("text-spec text-pretty text-muted-foreground", { "basis-full": isCompact, "max-w-[44ch]": !isCompact })}>
              {t("hint", { max: VIDEO_UPLOAD_MAX_GIGABYTES, types })}
            </p>
          </>
        )}
      </DropZone>
      <ValidationFieldError
        id={errorId}
        message={error}
        namespace="course.validations"
        params={{ ...COURSE_VALIDATION_PARAMS, videoTypeUnsupported: { types } }}
      />
    </div>
  )
}
