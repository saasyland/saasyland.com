import { FLOW_AREA, FLOW_STATUS, type Flow } from "./flows"

export const AFFILIATES_FLOWS = [
  {
    area: FLOW_AREA.AFFILIATES,
    id: "affiliate-script",
    outcome: "Affonso's script loads, and sets the referral cookie, only on a visit through an affiliate link while the programme is open",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "affiliates.spec.ts", title: "loads Affonso's script only on a visit through an affiliate link while the programme is open" }],
  },
  {
    area: FLOW_AREA.AFFILIATES,
    id: "affiliate-terms",
    outcome: "/affiliates publishes the commission, the payout terms and how to join, and the footer links to it",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "affiliates.spec.ts", title: "publishes the affiliate terms and says how to join while the programme is in its current status" }],
  },
  {
    area: FLOW_AREA.AFFILIATES,
    id: "affiliate-referral-checkout",
    outcome: "A buyer who came through an affiliate link carries the referral into the Polar checkout's metadata",
    reason: "The spec checks the referral cookie; no spec checks out with one.",
    status: FLOW_STATUS.MISSING,
  },
] as const satisfies readonly Flow[]
