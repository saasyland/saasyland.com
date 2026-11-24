import { type JSX, useEffect, useState } from "react"

import { AFFONSO } from "~/src/integrations/affonso/affonso.constants"
import { getAffonsoProgramId } from "~/src/integrations/affonso/affonso.program"

import { AFFILIATE_PROGRAM, AFFILIATE_TERMS } from "~/src/data/affiliates"
import { FEATURE_STATUS } from "~/src/data/navigation.constants"

export const AffiliateReferral = (): JSX.Element | undefined => {
  const [programId, setProgramId] = useState<string>()

  useEffect(() => {
    const params = new URLSearchParams(globalThis.location.search)

    if (AFFILIATE_PROGRAM === FEATURE_STATUS.AVAILABLE && AFFONSO.REFERRAL_PARAMS.some((param) => params.has(param))) {
      void getAffonsoProgramId().then(setProgramId)
    }
  }, [])

  if (programId === undefined) {
    return
  }

  return <script async data-affonso={programId} data-cookie_duration={AFFILIATE_TERMS.COOKIE_DAYS} src={AFFONSO.PIXEL_URL} />
}
