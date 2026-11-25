import { useFormatter } from "use-intl/react"

import { BYTES_PER_GIGABYTE, BYTES_PER_KILOBYTE, BYTES_PER_MEGABYTE } from "~/src/lib/file-size"

const SIZE_DIGITS = 1

export const useFileSize = (): ((bytes: number) => string) => {
  const format = useFormatter()

  return (bytes) => {
    if (bytes < BYTES_PER_MEGABYTE) {
      return format.number(bytes / BYTES_PER_KILOBYTE, { maximumFractionDigits: SIZE_DIGITS, style: "unit", unit: "kilobyte" })
    }

    if (bytes < BYTES_PER_GIGABYTE) {
      return format.number(bytes / BYTES_PER_MEGABYTE, { maximumFractionDigits: SIZE_DIGITS, style: "unit", unit: "megabyte" })
    }

    return format.number(bytes / BYTES_PER_GIGABYTE, { maximumFractionDigits: SIZE_DIGITS, style: "unit", unit: "gigabyte" })
  }
}
