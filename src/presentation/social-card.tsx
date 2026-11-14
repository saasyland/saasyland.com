import type { JSX, ReactNode } from "react"

import { SOCIAL_CARD_FONTS } from "~/src/integrations/takumi/takumi.fonts"

import { APP_DOMAIN, APP_LOGO_PATH, APP_NAME } from "~/src/presentation/branding"

const LONG_TITLE_LENGTH = 48

const Logo = ({ size }: { readonly size: string }): JSX.Element => (
  <svg fill="currentColor" style={{ height: size, width: size }} viewBox="0 0 24 24">
    <path d={APP_LOGO_PATH} />
  </svg>
)

const CardFrame = ({ children }: { readonly children: ReactNode }): JSX.Element => (
  <div
    style={{
      backgroundColor: "var(--background)",
      color: "var(--foreground)",
      display: "flex",
      fontFamily: SOCIAL_CARD_FONTS.SANS,
      height: "100%",
      position: "relative",
      width: "100%",
    }}
  >
    <div className="field-grid" style={{ inset: "0", position: "absolute" }} />
    <div className="field-signal" style={{ inset: "0", position: "absolute" }} />
    <div style={{ display: "flex", flexDirection: "column", flexGrow: "1", padding: "4.5rem 5rem", position: "relative" }}>
      {children}
      <span style={{ color: "var(--muted-foreground)", fontFamily: SOCIAL_CARD_FONTS.MONO, fontSize: "1.5rem", letterSpacing: "0.01em" }}>
        {APP_DOMAIN}
      </span>
    </div>
  </div>
)

export const PageCard = ({ section, title }: { readonly section?: string | undefined; readonly title: string }): JSX.Element => (
  <CardFrame>
    <div style={{ alignItems: "center", display: "flex", gap: "1rem" }}>
      <Logo size="2.5rem" />
      <span style={{ fontSize: "2.125rem", fontWeight: "600", letterSpacing: "-0.02em" }}>{APP_NAME}</span>
    </div>
    <div style={{ display: "flex", flexDirection: "column", flexGrow: "1", gap: "1.5rem", justifyContent: "center" }}>
      {section !== undefined && (
        <span
          style={{
            color: "var(--ring)",
            fontFamily: SOCIAL_CARD_FONTS.MONO,
            fontSize: "1.625rem",
            fontWeight: "500",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {section}
        </span>
      )}
      <span
        style={{
          fontSize: title.length > LONG_TITLE_LENGTH ? "3.75rem" : "4.75rem",
          fontWeight: "600",
          letterSpacing: "-0.035em",
          lineClamp: "4",
          lineHeight: "1.08",
          maxWidth: "65rem",
          textWrap: "balance",
        }}
      >
        {title}
      </span>
    </div>
  </CardFrame>
)

export const SiteCard = (): JSX.Element => (
  <CardFrame>
    <div style={{ alignItems: "center", display: "flex", flexGrow: "1", gap: "2rem" }}>
      <Logo size="6rem" />
      <span style={{ fontSize: "6.5rem", fontWeight: "600", letterSpacing: "-0.035em" }}>{APP_NAME}</span>
    </div>
  </CardFrame>
)
