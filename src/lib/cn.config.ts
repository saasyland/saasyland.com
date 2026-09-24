import type { ConfigExtension } from "cn/config"

export default {
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "body",
            "body-sm",
            "display-blast",
            "display-gate",
            "display-hero",
            "headline-peak",
            "headline-support",
            "label",
            "lead",
            "price",
            "spec",
            "statement",
            "title",
          ],
        },
      ],
    },
  },
} satisfies ConfigExtension
