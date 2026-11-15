import analytics from "../../../messages/en-US/navigation.analytics.json"
import auth from "../../../messages/en-US/navigation.auth.json"
import courses from "../../../messages/en-US/navigation.courses.json"
import pageBuilder from "../../../messages/en-US/navigation.page-builder.json"
import payments from "../../../messages/en-US/navigation.payments.json"
import postEditor from "../../../messages/en-US/navigation.post-editor.json"
import products from "../../../messages/en-US/navigation.products.json"
import sidebar from "../../../messages/en-US/pages.admin.sidebar.json"
import { ADMIN_NAVIGATION } from "../../../src/data/navigation"
import { APP_NAME } from "../../../src/presentation/branding"

import type { ReactNode } from "react"

import { MONO, SANS } from "../fonts"
import { THEME } from "../theme"
import { Mark } from "./course-ui"

export const RAIL_WIDTH = 300
export const HEADER_HEIGHT = 84

const AREA_LABELS = new Map(
  Object.entries({ analytics, auth, courses, "page-builder": pageBuilder, payments, "post-editor": postEditor, products }).map(
    ([area, labels]) => [area, new Map(Object.entries(labels.admin))],
  ),
)

export function Rail({ activeIndex, reveal }: Readonly<{ activeIndex: number; reveal: (index: number) => number }>) {
  let row = 0

  return (
    <div
      style={{
        backgroundColor: THEME.sidebar,
        borderRight: `1px solid ${THEME.hairline}`,
        display: "flex",
        flexDirection: "column",
        flexShrink: 0,
        width: RAIL_WIDTH,
      }}
    >
      <div
        style={{
          alignItems: "center",
          borderBottom: `1px solid ${THEME.hairline}`,
          display: "flex",
          gap: 12,
          height: HEADER_HEIGHT,
          paddingLeft: 24,
        }}
      >
        <Mark size={22} />
        <span style={{ fontFamily: SANS, fontSize: 19, fontWeight: 600, letterSpacing: "-0.02em" }}>{APP_NAME}</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 20, padding: "20px 12px" }}>
        {ADMIN_NAVIGATION.map((group) => (
          <div key={group.key}>
            <div
              style={{
                color: THEME.mutedForeground,
                fontFamily: MONO,
                fontSize: 13,
                letterSpacing: "0.09em",
                paddingLeft: 10,
                textTransform: "uppercase",
              }}
            >
              {sidebar.groups[group.key]}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 3, marginTop: 8 }}>
              {group.items.map((item) => {
                const index = row++
                const isActive = index === activeIndex
                return (
                  <div
                    key={item.key}
                    style={{
                      alignItems: "center",
                      backgroundColor: isActive ? THEME.muted : "transparent",
                      borderRadius: 8,
                      color: isActive ? THEME.foreground : THEME.mutedForeground,
                      display: "flex",
                      fontFamily: SANS,
                      fontSize: 16,
                      gap: 12,
                      height: 38,
                      opacity: reveal(index),
                      paddingLeft: 10,
                    }}
                  >
                    <span
                      style={{
                        backgroundColor: isActive ? THEME.accent : THEME.mutedForeground,
                        borderRadius: 3,
                        height: 12,
                        opacity: isActive ? 1 : 0.55,
                        width: 12,
                      }}
                    />
                    {AREA_LABELS.get(item.area)?.get(item.key)}
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function Header({ crumb, opacity }: Readonly<{ crumb: string; opacity: number }>) {
  return (
    <div
      style={{
        alignItems: "center",
        borderBottom: `1px solid ${THEME.hairline}`,
        display: "flex",
        flexShrink: 0,
        height: HEADER_HEIGHT,
        justifyContent: "space-between",
        opacity,
        padding: "0 28px",
      }}
    >
      <div style={{ alignItems: "center", color: THEME.mutedForeground, display: "flex", fontFamily: SANS, fontSize: 16, gap: 10 }}>
        <span>Home</span>
        <span style={{ opacity: 0.4 }}>/</span>
        <span style={{ color: THEME.foreground, fontWeight: 500 }}>{crumb}</span>
      </div>
      <div
        style={{
          alignItems: "center",
          border: `1px solid ${THEME.hairline}`,
          borderRadius: 9,
          color: THEME.mutedForeground,
          display: "flex",
          fontFamily: SANS,
          fontSize: 15,
          gap: 10,
          height: 38,
          padding: "0 12px",
        }}
      >
        Search the console
        <span style={{ color: THEME.mutedForeground, fontFamily: MONO, fontSize: 13, opacity: 0.7 }}>⌘K</span>
      </div>
    </div>
  )
}

export function Panel({ children, style }: Readonly<{ children: ReactNode; style?: React.CSSProperties }>) {
  return (
    <div
      style={{
        backgroundColor: THEME.card,
        border: `1px solid ${THEME.hairline}`,
        borderRadius: 14,
        overflow: "hidden",
        ...style,
      }}
    >
      {children}
    </div>
  )
}
