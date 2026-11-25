import { FLOW_FEATURE, FLOW_STATUS, type Flow } from "./flows"

export const AFFILIATES_FLOWS = [
  {
    feature: FLOW_FEATURE.AFFILIATES,
    id: "affiliate-script",
    outcome: "Affonso's script loads, and sets the referral cookie, only on a visit through an affiliate link while the programme is open",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "affiliates.spec.ts", title: "loads Affonso's script only on a visit through an affiliate link while the programme is open" }],
  },
  {
    feature: FLOW_FEATURE.AFFILIATES,
    id: "affiliate-terms",
    outcome: "/affiliates publishes the commission, the payout terms and how to join, and the footer links to it",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "affiliates.spec.ts", title: "publishes the affiliate terms and says how to join while the programme is in its current status" }],
  },
  {
    feature: FLOW_FEATURE.AFFILIATES,
    id: "affiliate-referral-checkout",
    outcome: "A buyer who came through an affiliate link carries the referral into the Polar checkout's metadata",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "affiliate-checkout.spec.ts",
        title: "a buyer whose visit through an affiliate link left Affonso's referral cookie carries the referral into the Polar checkout's metadata",
      },
    ],
  },
] as const satisfies readonly Flow[]
