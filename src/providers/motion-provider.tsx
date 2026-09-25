import type { JSX, ReactNode } from "react"

import { type FeatureBundle, LazyMotion, MotionConfig } from "motion/react"

const loadFeatures = async (): Promise<FeatureBundle> => {
  const features = await import("~/src/integrations/motion/motion.features")
  return features.default
}

interface MotionProviderProps {
  readonly children: ReactNode
}

// Mount inside route components, never around a route <Outlet />: the features' arrival would force that route to hydrate early.
export const MotionProvider = ({ children }: MotionProviderProps): JSX.Element => (
  <LazyMotion features={loadFeatures} strict>
    <MotionConfig reducedMotion="user">{children}</MotionConfig>
  </LazyMotion>
)
