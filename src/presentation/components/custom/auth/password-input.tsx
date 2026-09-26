import { type ComponentProps, type JSX, useState } from "react"

import { Eye, EyeOff } from "lucide-react"
import { useTranslations } from "use-intl/react"

import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from "~/src/presentation/components/shadcn/input-group"

export const PasswordInput = (props: Readonly<ComponentProps<typeof InputGroupInput>>): JSX.Element => {
  const t = useTranslations("auth.form")
  const [isVisible, setIsVisible] = useState(false)

  return (
    <InputGroup className="h-11 rounded-lg border-input transition-[border-color,box-shadow] duration-200 ease-exp dark:bg-input/30">
      <InputGroupInput
        className="px-3 text-base text-foreground placeholder:text-muted-foreground md:text-sm"
        placeholder={t("placeholderPassword")}
        type={isVisible ? "text" : "password"}
        {...props}
      />
      <InputGroupAddon align="inline-end" className="pr-0">
        <InputGroupButton
          aria-label={t(isVisible ? "hidePassword" : "showPassword")}
          className="size-11 rounded-none rounded-r-lg text-muted-foreground transition-[background-color,color] duration-200 ease-exp hover:bg-muted hover:text-foreground"
          onPress={() => {
            setIsVisible(!isVisible)
          }}
          size="icon-sm"
        >
          {isVisible && <EyeOff aria-hidden className="size-4" strokeWidth={1.5} />}
          {!isVisible && <Eye aria-hidden className="size-4" strokeWidth={1.5} />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  )
}
