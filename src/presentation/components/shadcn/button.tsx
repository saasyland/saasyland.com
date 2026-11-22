import type { RefAttributes } from "react"

import { createLink } from "@tanstack/react-router"
import {
  Button as ButtonPrimitive,
  type ButtonProps as ButtonPrimitiveProps,
  Link as LinkPrimitive,
  type LinkProps as LinkPrimitiveProps,
} from "react-aria-components"

import { cn } from "~/src/lib/cn"

import { type ButtonVariantProps, buttonVariants } from "~/src/presentation/components/shadcn/_lib/button-variants"

type ButtonProps = Omit<ButtonPrimitiveProps, "className"> &
  RefAttributes<HTMLButtonElement> &
  ButtonVariantProps & {
    className?: string
  }

const SUBMIT_PROPS = { preventFocusOnPress: true } as const

const Button = ({ className, size = "default", variant = "default", ...props }: ButtonProps) => (
  <ButtonPrimitive
    className={cn(buttonVariants({ className, size, variant }))}
    data-size={size}
    data-slot="button"
    data-variant={variant}
    {...(props.type === "submit" ? SUBMIT_PROPS : {})}
    {...props}
  />
)

type AnchorButtonProps = Omit<LinkPrimitiveProps, "className"> &
  ButtonVariantProps & {
    className?: string
  }

const AnchorButton = ({ className, size = "default", variant = "default", ...props }: AnchorButtonProps) => (
  <LinkPrimitive
    className={cn(buttonVariants({ className, size, variant }))}
    data-size={size}
    data-slot="button"
    data-variant={variant}
    {...props}
  />
)

export { buttonVariants, type ButtonVariantProps } from "~/src/presentation/components/shadcn/_lib/button-variants"
const LinkButton = createLink(AnchorButton)

export { AnchorButton, Button, LinkButton }
export type { AnchorButtonProps, ButtonProps }
