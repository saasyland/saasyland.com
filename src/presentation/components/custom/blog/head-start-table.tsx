import type { JSX } from "react"

import defaultMdxComponents from "@fumadocs/base-ui/mdx"
import { useFormatter, useTranslations } from "use-intl/react"

import { HEAD_START_HIGH_HOURS, HEAD_START_LOW_HOURS, HEAD_START_ROWS } from "~/src/data/head-start"

import { REPOSITORY_FACTS } from "~/src/lib/repository-facts"

export const HeadStartTable = (): JSX.Element => {
  const format = useFormatter()
  const t = useTranslations("pages.blog.headStart")

  return (
    <defaultMdxComponents.table>
      <thead>
        <tr>
          <th>{t("columns.work")}</th>
          <th>{t("columns.layers")}</th>
          <th>{t("columns.hours")}</th>
        </tr>
      </thead>
      <tbody>
        {HEAD_START_ROWS.map(({ high, id, layers, low }) => (
          <tr key={id}>
            <td>{t(`rows.${id}`, { coverageThreshold: REPOSITORY_FACTS.coverageThreshold })}</td>
            <td>{format.list(layers.map((layer) => <code key={layer}>{layer}</code>))}</td>
            <td>{t("hours", { high, low })}</td>
          </tr>
        ))}
        <tr>
          <td>
            <strong>{t("total")}</strong>
          </td>
          <td />
          <td>
            <strong>{t("hours", { high: HEAD_START_HIGH_HOURS, low: HEAD_START_LOW_HOURS })}</strong>
          </td>
        </tr>
      </tbody>
    </defaultMdxComponents.table>
  )
}
