import type { JSX } from "react"

import { GripVertical, Pencil, PlayCircle, Plus, PlusCircle, Settings, Trash2 } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { ADMIN_COURSE_CURRICULUM_SECTIONS } from "~/src/data/admin"

import { Button } from "~/src/presentation/components/shadcn/button"
import { Card } from "~/src/presentation/components/shadcn/card"

export const CourseCurriculum = (): JSX.Element => {
  const t = useTranslations("pages.admin")

  return (
    <Card className="p-5 sm:p-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h2 className="text-base font-medium text-foreground">{t("courses.create.sections.curriculum.title")}</h2>
          <p className="mt-1 text-xs text-muted-foreground">{t("courses.create.sections.curriculum.description")}</p>
        </div>
        <Button variant="ghost" className="h-8 px-3 text-sm">
          {t("courses.create.sections.curriculum.expandAll")}
        </Button>
      </div>

      {ADMIN_COURSE_CURRICULUM_SECTIONS.map((section) => (
        <div className="mb-6" key={section.id}>
          <div className="group mb-3 flex items-center">
            <div className="cursor-move p-1 text-muted-foreground transition-colors hover:text-foreground">
              <GripVertical className="size-4" />
            </div>
            <div className="ml-1 flex flex-1 items-center gap-2">
              <Button variant="ghost" size="icon-sm" className="text-muted-foreground transition-colors hover:text-foreground">
                <section.icon className="size-4" />
              </Button>
              <h3 className="text-sm font-medium text-foreground">{t(`labels.${section.id}`)}</h3>
            </div>
            <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:bg-white/5 hover:text-foreground">
                <Pencil className="size-4" />
              </Button>
              <Button variant="ghost" size="icon-sm" className="text-muted-foreground hover:bg-white/5 hover:text-destructive">
                <Trash2 className="size-4" />
              </Button>
            </div>
          </div>

          {section.lessons.length > 0 && (
            <div className="space-y-2 pl-8">
              {section.lessons.map((lesson) => (
                <div
                  className="group flex cursor-pointer items-center gap-3 rounded-xl border border-border bg-muted/30 p-3 transition-colors hover:border-border"
                  key={lesson.id}
                >
                  <div className="cursor-move text-muted-foreground opacity-0 transition-all group-hover:text-foreground group-hover:opacity-100">
                    <GripVertical className="size-4" />
                  </div>
                  <div className="-ml-2 flex-1 transition-all group-hover:ml-0">
                    <p className="text-sm font-medium text-foreground">{t(`labels.${lesson.id}`)}</p>
                  </div>
                  <div className="flex items-center gap-3 text-muted-foreground">
                    <PlayCircle className="size-4 transition-colors hover:text-foreground" />
                    <lesson.icon className="size-4 transition-colors hover:text-foreground" />
                  </div>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="ml-2 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100"
                  >
                    <Settings className="size-4" />
                  </Button>
                </div>
              ))}
              <Button
                variant="outline"
                className="mt-2 w-full justify-center gap-2 border-dashed border-transparent bg-muted/30 hover:border-border hover:bg-muted/40"
              >
                <PlusCircle className="size-4" />
                {t("courses.create.sections.curriculum.addLesson")}
              </Button>
            </div>
          )}
        </div>
      ))}

      <Button variant="outline" className="mt-4 w-full justify-center gap-2 border-dashed bg-muted/30">
        <Plus className="size-4" />
        {t("courses.create.sections.curriculum.addSection")}
      </Button>
    </Card>
  )
}
