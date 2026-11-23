import "@tanstack/react-start/server-only"

import zod from "zod/v4"

import { AFFONSO } from "~/src/integrations/affonso/affonso.constants"

import { readCookie } from "~/src/lib/cookie"

const referralSchema = zod.string().regex(/^[\w-]{1,128}$/u)

export const affonsoReferralMetadata = (headers: Headers): Record<string, string> => {
  const referral = referralSchema.safeParse(readCookie({ header: headers.get("cookie"), name: AFFONSO.REFERRAL_COOKIE }))

  return referral.success ? { [AFFONSO.METADATA_KEY]: referral.data } : {}
}
