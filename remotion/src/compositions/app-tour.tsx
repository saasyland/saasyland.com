import authNavigation from "../../../messages/en-US/navigation.auth.json"
import { ADMIN_NAVIGATION } from "../../../src/data/navigation"
import { AbsoluteFill, Easing, Interactive, interpolate, useCurrentFrame } from "remotion"

import { Header, Panel, Rail } from "../components/app-chrome"
import { Plate } from "../components/plate"
import { MONO, SANS } from "../fonts"
import { FPS, THEME } from "../theme"

const PAD = 28
const CHART_W = 1160
const CHART_H = 210

const STATS = [
  { label: "Registered users", value: "2,841" },
  { label: "Products in catalog", value: "36" },
  { label: "Pending email verification", value: "12" },
] as const

const SERIES = [0.22, 0.24, 0.23, 0.3, 0.52, 0.6, 0.57, 0.59, 0.62, 0.55, 0.58, 0.78] as const

const ROWS = [
  { email: "marta@northwind.dev", name: "Marta Kowalczyk", role: "Admin", state: "active" },
  { email: "dele@okonkwo.io", name: "Dele Okonkwo", role: "Customer", state: "active" },
  { email: "hana@nakamura.jp", name: "Hana Nakamura", role: "Customer", state: "pending" },
  { email: "rafael@santos.br", name: "Rafael Santos", role: "Customer", state: "active" },
] as const

const TOUR_TO_USERS = 1.4 * FPS
const TOUR_TO_DASHBOARD = 5.2 * FPS

const FADE = 0.22 * FPS
const GAP = 0.34 * FPS

const HIGHLIGHT_FROM = 6.4 * FPS
const HIGHLIGHT_STEP = 0.5 * FPS

const ADMIN_ITEMS = ADMIN_NAVIGATION.flatMap(({ items }) => items)

const DASHBOARD_ROW = ADMIN_ITEMS.findIndex(({ label }) => label === "navigation.auth.admin.dashboard")

const USERS_ROW = ADMIN_ITEMS.findIndex(({ label }) => label === "navigation.auth.admin.userManagement")

function StatPlate() {
  return (
    <div
      style={{
        backgroundColor: THEME.hairline,
        border: `1px solid ${THEME.hairline}`,
        borderRadius: 14,
        columnGap: 1,
        display: "grid",
        gridTemplateColumns: "repeat(3, 1fr)",
        overflow: "hidden",
      }}
    >
      {STATS.map((stat) => (
        <div key={stat.label} style={{ backgroundColor: THEME.card, padding: "22px 26px" }}>
          <div
            style={{
              color: THEME.mutedForeground,
              fontFamily: MONO,
              fontSize: 13,
              letterSpacing: "0.09em",
              textTransform: "uppercase",
            }}
          >
            {stat.label}
          </div>
          <div
            style={{
              color: THEME.foreground,
              fontFamily: SANS,
              fontSize: 40,
              fontVariantNumeric: "tabular-nums",
              fontWeight: 600,
              letterSpacing: "-0.03em",
              marginTop: 10,
            }}
          >
            {stat.value}
          </div>
        </div>
      ))}
    </div>
  )
}

function DashboardScreen({ highlighted }: Readonly<{ highlighted: number }>) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <StatPlate />

      <Panel style={{ padding: 26 }}>
        <div style={{ color: THEME.foreground, fontFamily: SANS, fontSize: 20, fontWeight: 600, letterSpacing: "-0.02em" }}>Revenue</div>
        <div style={{ color: THEME.mutedForeground, fontFamily: SANS, fontSize: 15, lineHeight: 1.45, marginTop: 4, maxWidth: 900 }}>
          Orders Polar reports as paid in the period, counted by the UTC day or month they were placed. Amounts include tax, and each refund
          is subtracted from the order it refunds.
        </div>
        <div style={{ alignItems: "flex-end", display: "flex", gap: 14, height: CHART_H, marginTop: 18, width: CHART_W }}>
          {SERIES.map((value, index) => (
            <div
              key={index}
              style={{
                backgroundColor: index === SERIES.length - 1 ? THEME.accent : THEME.accentMuted,
                borderRadius: 4,
                flexGrow: 1,
                height: `${(value * 100).toFixed(2)}%`,
              }}
            />
          ))}
        </div>
      </Panel>

      <Panel>
        <div
          style={{
            borderBottom: `1px solid ${THEME.hairline}`,
            color: THEME.foreground,
            fontFamily: SANS,
            fontSize: 19,
            fontWeight: 600,
            letterSpacing: "-0.02em",
            padding: "18px 26px",
          }}
        >
          Newest users
        </div>
        {ROWS.map((row, index) => (
          <div
            key={row.email}
            style={{
              alignItems: "center",
              backgroundColor: index === highlighted ? THEME.muted : "transparent",
              borderBottom: index === ROWS.length - 1 ? "none" : `1px solid ${THEME.hairline}`,
              display: "flex",
              gap: 16,
              padding: "14px 26px",
            }}
          >
            <span
              style={{
                alignItems: "center",
                backgroundColor: THEME.muted,
                borderRadius: 8,
                color: THEME.foreground,
                display: "flex",
                fontFamily: SANS,
                fontSize: 13,
                fontWeight: 600,
                height: 36,
                justifyContent: "center",
                width: 36,
              }}
            >
              {row.name
                .split(" ")
                .map((part) => part.charAt(0))
                .join("")}
            </span>
            <span style={{ flexGrow: 1, minWidth: 0 }}>
              <span style={{ color: THEME.foreground, display: "block", fontFamily: SANS, fontSize: 16, fontWeight: 500 }}>{row.name}</span>
              <span style={{ color: THEME.mutedForeground, display: "block", fontFamily: SANS, fontSize: 14 }}>{row.email}</span>
            </span>
            <span style={{ color: THEME.mutedForeground, fontFamily: SANS, fontSize: 15, width: 130 }}>{row.role}</span>
            <span
              style={{
                alignItems: "center",
                color: row.state === "active" ? THEME.accent : THEME.mutedForeground,
                display: "flex",
                fontFamily: SANS,
                fontSize: 15,
                gap: 9,
                width: 120,
              }}
            >
              <span
                style={{
                  backgroundColor: row.state === "active" ? THEME.accent : THEME.mutedForeground,
                  borderRadius: 999,
                  height: 7,
                  width: 7,
                }}
              />
              {row.state}
            </span>
          </div>
        ))}
      </Panel>
    </div>
  )
}

function UsersScreen() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 22 }}>
      <div>
        <div style={{ color: THEME.foreground, fontFamily: SANS, fontSize: 28, fontWeight: 600, letterSpacing: "-0.02em" }}>
          User Management
        </div>
        <div style={{ color: THEME.mutedForeground, fontFamily: SANS, fontSize: 16, marginTop: 6 }}>
          Manage your team members, permissions, and customer accounts.
        </div>
      </div>
      <div style={{ borderBottom: `1px solid ${THEME.hairline}`, display: "flex", fontFamily: SANS, fontSize: 16 }}>
        <span style={{ borderBottom: `2px solid ${THEME.foreground}`, color: THEME.foreground, paddingBottom: 10 }}>
          {authNavigation.userTabs.allUsers}
        </span>
      </div>
      <Panel>
        <div
          style={{
            borderBottom: `1px solid ${THEME.hairline}`,
            color: THEME.foreground,
            display: "grid",
            fontFamily: MONO,
            fontSize: 13,
            gridTemplateColumns: "1fr 160px 140px",
            letterSpacing: "0.09em",
            padding: "16px 26px",
            textTransform: "uppercase",
          }}
        >
          <span>User</span>
          <span>Role</span>
          <span>Status</span>
        </div>
        {ROWS.map((row, index) => (
          <div
            key={row.email}
            style={{
              alignItems: "center",
              borderBottom: index === ROWS.length - 1 ? "none" : `1px solid ${THEME.hairline}`,
              display: "grid",
              fontFamily: SANS,
              gridTemplateColumns: "1fr 160px 140px",
              padding: "16px 26px",
            }}
          >
            <span>
              <span style={{ color: THEME.foreground, display: "block", fontSize: 17, fontWeight: 500 }}>{row.name}</span>
              <span style={{ color: THEME.mutedForeground, display: "block", fontSize: 14 }}>{row.email}</span>
            </span>
            <span style={{ color: THEME.mutedForeground, fontSize: 15 }}>{row.role}</span>
            <span style={{ color: row.state === "active" ? THEME.accent : THEME.mutedForeground, fontSize: 15 }}>{row.state}</span>
          </div>
        ))}
      </Panel>
    </div>
  )
}

export function AppTour() {
  const frame = useCurrentFrame()

  const dashboardOpacity = interpolate(
    frame,
    [TOUR_TO_USERS, TOUR_TO_USERS + FADE, TOUR_TO_DASHBOARD + GAP, TOUR_TO_DASHBOARD + GAP + FADE],
    [1, 0, 0, 1],
    { easing: Easing.bezier(0.4, 0, 0.2, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  )
  const usersOpacity = interpolate(
    frame,
    [TOUR_TO_USERS + GAP, TOUR_TO_USERS + GAP + FADE, TOUR_TO_DASHBOARD, TOUR_TO_DASHBOARD + FADE],
    [0, 1, 1, 0],
    { easing: Easing.bezier(0.4, 0, 0.2, 1), extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  )
  const showUsers = frame >= TOUR_TO_USERS + GAP && frame < TOUR_TO_DASHBOARD + GAP

  const highlighted = Math.floor((frame - HIGHLIGHT_FROM) / HIGHLIGHT_STEP)

  return (
    <Plate ground={THEME.background} seam={false}>
      <AbsoluteFill style={{ flexDirection: "row" }}>
        <Rail activeIndex={showUsers ? USERS_ROW : DASHBOARD_ROW} reveal={() => 1} />

        <div style={{ display: "flex", flexDirection: "column", flexGrow: 1, minWidth: 0 }}>
          <Header crumb={showUsers ? authNavigation.admin.userManagement : authNavigation.admin.dashboard} opacity={1} />

          <div style={{ flexGrow: 1, position: "relative" }}>
            <Interactive.Div
              name="Dashboard"
              style={{
                inset: 0,
                opacity: dashboardOpacity,
                padding: PAD,
                position: "absolute",
                translate: `0px ${((1 - dashboardOpacity) * -10).toFixed(2)}px`,
              }}
            >
              <DashboardScreen highlighted={highlighted >= 0 && highlighted < ROWS.length ? highlighted : -1} />
            </Interactive.Div>

            <Interactive.Div
              name="Users"
              style={{
                inset: 0,
                opacity: usersOpacity,
                padding: PAD,
                position: "absolute",
                translate: `0px ${((1 - usersOpacity) * 10).toFixed(2)}px`,
              }}
            >
              <UsersScreen />
            </Interactive.Div>
          </div>
        </div>
      </AbsoluteFill>
    </Plate>
  )
}
