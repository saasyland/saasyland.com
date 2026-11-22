import { type JSX, useMemo } from "react"

import { encode } from "uqr"

const modulePath = (rows: readonly (readonly boolean[])[]): string =>
  rows.flatMap((row, top) => row.flatMap((isDark, left) => (isDark ? [`M${String(left)} ${String(top)}h1v1h-1z`] : []))).join("")

export const TwoFactorQrCode = ({ label, value }: { readonly label: string; readonly value: string }): JSX.Element => {
  const { data } = useMemo(() => encode(value, { border: 0 }), [value])

  return (
    <svg
      aria-label={label}
      className="size-44 rounded-md bg-white p-3 text-black"
      role="img"
      viewBox={`0 0 ${String(data.length)} ${String(data.length)}`}
    >
      <path d={modulePath(data)} fill="currentColor" shapeRendering="crispEdges" />
    </svg>
  )
}
