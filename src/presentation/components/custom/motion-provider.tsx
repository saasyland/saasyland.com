import type { JSX, ReactNode } from "react"

import { type FeatureBundle, LazyMotion, MotionConfig } from "motion/react"

const loadFeatures = async (): Promise<FeatureBundle> => {
  const features = await import("~/src/presentation/components/custom/motion-features")
  return features.default
}

interface MotionProviderProps {
  readonly children: ReactNode
}

export const MotionProvider = ({ children }: MotionProviderProps): JSX.Element => (
  <LazyMotion features={loadFeatures} strict>
    <MotionConfig reducedMotion="user">{children}</MotionConfig>
  </LazyMotion>
)
