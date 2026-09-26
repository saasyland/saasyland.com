import { useFormatter } from "use-intl/react"

export const PostViews = ({ views }: { readonly views: number }): string => {
  const format = useFormatter()

  return format.number(views, { maximumFractionDigits: 1, notation: "compact" })
}
