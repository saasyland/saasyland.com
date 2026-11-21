import { RuleTester } from "vite-plus/lint/plugins-dev"

import { noOffScale } from "~/scripts/radius-lint-plugin"

const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "tsx" } } })

const step = { messageId: "step" }
const property = { messageId: "property" }
const custom = { messageId: "custom" }
const style = { messageId: "style" }

tester.run("no-off-scale", noOffScale, {
  invalid: [
    { code: 'const Card = () => <div className="rounded-xl border" />', errors: [step] },
    { code: 'const Panel = () => <section className="overflow-hidden rounded-2xl" />', errors: [step] },
    { code: 'const badge = cva("inline-flex rounded-4xl px-2")', errors: [step] },
    { code: 'const Bubble = () => <p className="rounded-3xl" />', errors: [step] },
    { code: 'const Marker = () => <span className="size-1 rounded-xs" />', errors: [step] },
    { code: 'const Code = () => <code className="rounded bg-muted" />', errors: [step] },
    { code: 'const Cell = () => <td className="rounded-l" />', errors: [step] },
    { code: 'const Box = () => <div className="rounded-[4px]" />', errors: [step] },
    { code: 'const Day = () => <div className="rounded-(--cell-radius)" />', errors: [step] },
    { code: 'const Item = () => <div className="md:hover:rounded-t-xl" />', errors: [step] },
    { code: 'const Slot = () => <div className="[&>[data-slot]:not(:has(~[data-slot]))]:rounded-r-xl!" />', errors: [step] },
    { code: 'const Pill = () => <div className={cn("px-2", { "rounded-2xl": wide })} />', errors: [step] },
    { code: `const Tile = ({ size }) => <div className={\`border rounded-\${size}\`} />`, errors: [step] },
    { code: 'const Corner = () => <div className="[border-radius:12px]" />', errors: [property] },
    { code: 'const Corner = () => <div className="[border-top-left-radius:var(--radius-lg)]" />', errors: [property] },
    { code: 'const Media = () => <div className="[--media-border-radius:14px]" />', errors: [custom] },
    { code: 'const Media = () => <div className="[--media-border-radius:var(--radius-xl)]" />', errors: [custom] },
    { code: "const Frame = () => <div style={{ borderRadius: 12 }} />", errors: [style] },
    { code: "const frame = { 'borderRadius': 4 }", errors: [style] },
  ],
  valid: [
    'const Card = () => <div className="overflow-hidden rounded-lg border bg-card" />',
    'const Button = () => <button className="h-8 rounded-md px-2.5" type="button" />',
    'const Kbd = () => <kbd className="rounded-sm bg-muted px-1" />',
    'const Avatar = () => <span className="size-8 rounded-full" />',
    'const Tabs = () => <div className="rounded-none border-b" />',
    'const Group = () => <div className="first:rounded-l-md last:rounded-r-md [&>[data-slot]:not(:has(~[data-slot]))]:rounded-b-md!" />',
    'const Sheet = () => <div className="data-[side=bottom]:rounded-t-lg rounded-tl-sm rounded-ss-md" />',
    'const Viewport = () => <div className="rounded-[inherit]" />',
    'const Media = () => <div className="[--media-border-radius:var(--radius-lg)]" />',
    'const Toaster = () => <div className="[--border-radius:var(--radius)]" />',
    'const Pill = () => <div className={cn("px-2", { "rounded-full": round })} />',
    `const Tile = () => <div className={\`border \${tone} rounded-md\`} />`,
    'const label = "roundedness and rounding"',
    "const { borderRadius } = getComputedStyle(element)",
    "const Frame = () => <div style={{ borderWidth: 1 }} />",
  ],
})
