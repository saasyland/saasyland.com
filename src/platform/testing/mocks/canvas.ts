import { vi } from "vite-plus/test"

const FALLBACK_TYPE = "image/png"

interface Drawing {
  readonly args: readonly number[]
  readonly height: number
  readonly smoothing: string
  readonly width: number
}

interface CanvasOptions {
  readonly decodes?: boolean
  readonly draws?: boolean
  readonly encodes?: readonly string[]
}

export const stubImageEncoding = ({ decodes = true, draws = true, encodes = ["image/webp", "image/jpeg"] }: CanvasOptions = {}) => {
  const bitmap = { close: vi.fn(), height: 1000, width: 2000 }
  const drawings: Drawing[] = []

  class Canvas {
    readonly height: number
    readonly width: number

    constructor(width: number, height: number) {
      this.height = height
      this.width = width
    }

    getContext() {
      if (!draws) {
        return null
      }

      const context = {
        drawImage: (_: unknown, ...args: number[]) => {
          drawings.push({ args, height: this.height, smoothing: context.imageSmoothingQuality, width: this.width })
        },
        imageSmoothingQuality: "low",
      }
      return context
    }

    convertToBlob({ type }: { type: string }) {
      return Promise.resolve(new Blob([String(this.width)], { type: encodes.includes(type) ? type : FALLBACK_TYPE }))
    }
  }

  vi.stubGlobal("OffscreenCanvas", Canvas)
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn(() => (decodes ? Promise.resolve(bitmap) : Promise.reject(new DOMException("The source image cannot be decoded.")))),
  )

  return { bitmap, drawings }
}
