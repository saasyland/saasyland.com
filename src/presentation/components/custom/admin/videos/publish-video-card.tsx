import type { JSX } from "react"

import { useTranslations } from "use-intl/react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/src/presentation/components/shadcn/card"

import { CopyButton } from "~/src/presentation/components/custom/copy-button"

const STEP_NUMBER_BASE = 1

const PUBLISH_STEPS = [
  { command: "brew install ffmpeg", id: "ffmpeg" },
  { command: "R2_ACCESS_KEY_ID=… R2_SECRET_ACCESS_KEY=…", id: "keys" },
  { command: 'bun run video:publish:production recording.mp4 --title "Lesson 01"', id: "publish" },
] as const

export const PublishVideoCard = (): JSX.Element => {
  const t = useTranslations("pages.admin.videos.publish")

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <h2>{t("title")}</h2>
        </CardTitle>
        <CardDescription>{t("description")}</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="flex flex-col gap-4">
          {PUBLISH_STEPS.map(({ command, id }, index) => (
            <li className="flex flex-col gap-2" key={id}>
              <p className="text-sm text-foreground">
                <span aria-hidden className="mr-2 font-mono text-muted-foreground tabular-nums">
                  {index + STEP_NUMBER_BASE}.
                </span>
                {t(`steps.${id}`)}
              </p>
              <div className="flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 py-1.5 pr-1.5 pl-3">
                <code className="min-w-0 truncate font-mono text-xs text-foreground">{command}</code>
                <CopyButton copiedLabel={t("copied")} copyLabel={t("copy")} value={command} />
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  )
}
