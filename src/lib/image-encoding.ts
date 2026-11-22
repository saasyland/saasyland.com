const CANVAS_CONTEXT = "2d"
const CENTERED = 2

interface ImageSize {
  readonly height: number
  readonly width: number
}

interface EncodeRequest<Size extends ImageSize> {
  readonly file: Blob
  readonly fallbackType: string
  readonly preferredType: string
  readonly quality: number
  readonly sizes: readonly Size[]
}

const encode = async (bitmap: ImageBitmap, request: Omit<EncodeRequest<ImageSize>, "file" | "sizes"> & ImageSize): Promise<Blob> => {
  const { fallbackType, height, preferredType, quality, width } = request
  const canvas = new OffscreenCanvas(width, height)
  const context = canvas.getContext(CANVAS_CONTEXT)
  if (context === null) {
    throw new Error("This browser cannot draw images.")
  }

  const scale = Math.max(width / bitmap.width, height / bitmap.height)
  const drawnWidth = bitmap.width * scale
  const drawnHeight = bitmap.height * scale
  context.imageSmoothingQuality = "high"
  context.drawImage(bitmap, (width - drawnWidth) / CENTERED, (height - drawnHeight) / CENTERED, drawnWidth, drawnHeight)

  const preferred = await canvas.convertToBlob({ quality, type: preferredType })
  if (preferred.type === preferredType) {
    return preferred
  }

  return canvas.convertToBlob({ quality, type: fallbackType })
}

export const encodeImages = async <Size extends ImageSize>({ file, sizes, ...options }: EncodeRequest<Size>) => {
  const bitmap = await createImageBitmap(file)

  try {
    return await Promise.all(sizes.map(async (size) => ({ ...size, image: await encode(bitmap, { ...options, ...size }) })))
  } finally {
    bitmap.close()
  }
}
