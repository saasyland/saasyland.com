import { FLOW_AREA, FLOW_STATUS, type Flow } from "./flows"

export const PAGE_BUILDER_FLOWS = [
  {
    area: FLOW_AREA.ADMIN_LANDING,
    id: "admin-landing-edit",
    outcome: "The admin edits a landing page section, and the public landing page shows the change",
    reason: "There is no page builder screen; the landing page's copy lives in the message files.",
    status: FLOW_STATUS.TO_BUILD,
  },
] as const satisfies readonly Flow[]
