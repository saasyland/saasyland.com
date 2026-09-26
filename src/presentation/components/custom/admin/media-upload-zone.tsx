import type { JSX, ReactNode } from "react"

import { CloudUpload } from "lucide-react"

export const MediaUploadZone = ({ children }: { readonly children: ReactNode }): JSX.Element => (
  <div className="group flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-muted/40 p-8 text-center transition-colors hover:border-border">
    <div className="mb-3 flex size-12 items-center justify-center rounded-full border border-border bg-muted/40 transition-transform group-hover:scale-105">
      <CloudUpload className="size-6 text-muted-foreground transition-colors group-hover:text-foreground" />
    </div>
    {children}
  </div>
)
