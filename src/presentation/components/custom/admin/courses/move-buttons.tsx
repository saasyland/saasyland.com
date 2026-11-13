import type { JSX } from "react"

import { ArrowDown, ArrowUp } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { MOVE_DIRECTION, type MoveDirection } from "~/src/modules/_core/constants/ordering"

import { Button } from "~/src/presentation/components/shadcn/button"

const ICON_BUTTON_CLASSNAME = "size-8 text-muted-foreground"

interface MoveButtonsProps {
  readonly isFirst: boolean
  readonly isLast: boolean
  readonly name: string
  readonly onMove: (direction: MoveDirection) => void
}

export const MoveButtons = ({ isFirst, isLast, name, onMove }: MoveButtonsProps): JSX.Element => {
  const t = useTranslations("pages.admin.courses.curriculum")

  return (
    <>
      <Button
        aria-label={t("moveUp", { name })}
        className={ICON_BUTTON_CLASSNAME}
        isDisabled={isFirst}
        onPress={() => {
          onMove(MOVE_DIRECTION.UP)
        }}
        size="icon"
        variant="ghost"
      >
        <ArrowUp aria-hidden className="size-4" />
      </Button>
      <Button
        aria-label={t("moveDown", { name })}
        className={ICON_BUTTON_CLASSNAME}
        isDisabled={isLast}
        onPress={() => {
          onMove(MOVE_DIRECTION.DOWN)
        }}
        size="icon"
        variant="ghost"
      >
        <ArrowDown aria-hidden className="size-4" />
      </Button>
    </>
  )
}
