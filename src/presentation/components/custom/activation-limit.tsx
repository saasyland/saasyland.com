import type { JSX } from "react"

import { useFormatter } from "use-intl/react"

import { LICENSE_ACTIVATION_LIMITS, type LicenseTier } from "~/src/modules/license/license.constants"

export const ActivationLimit = ({ tier }: { readonly tier: LicenseTier }): JSX.Element => {
  const format = useFormatter()

  return <>{format.number(LICENSE_ACTIVATION_LIMITS[tier])}</>
}
