interface Download {
  readonly content: string
  readonly fileName: string
  readonly type: string
}

export const downloadFile = ({ content, fileName, type }: Download): void => {
  const href = URL.createObjectURL(new Blob([content], { type }))
  const link = document.createElement("a")

  link.href = href
  link.download = fileName
  link.click()
  setTimeout(() => {
    URL.revokeObjectURL(href)
  }, 0)
}
