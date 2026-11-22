import { RuleTester } from "vite-plus/lint/plugins-dev"

import { monoForCode, noOffScale } from "~/scripts/type-lint-plugin"

const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "tsx" } } })

const floor = { messageId: "floor" }
const arbitrary = { messageId: "arbitrary" }
const property = { messageId: "property" }
const style = { messageId: "style" }
const label = { messageId: "label" }

tester.run("no-off-scale", noOffScale, {
  invalid: [
    { code: 'const Hint = () => <p className="text-xs text-muted-foreground" />', errors: [floor] },
    { code: 'const Hint = () => <p className="md:hover:text-xs" />', errors: [floor] },
    { code: 'const Hint = () => <p className="text-2xs" />', errors: [floor] },
    { code: 'const Badge = () => <span className="px-2 text-[10px] font-medium" />', errors: [arbitrary] },
    { code: 'const Cell = () => <td className="text-[0.8125rem]" />', errors: [arbitrary] },
    { code: 'const Title = () => <h1 className="text-[1.75rem]/[1.5]" />', errors: [arbitrary] },
    { code: 'const Code = () => <code className="text-[.9em]" />', errors: [arbitrary] },
    { code: 'const Fluid = () => <p className="text-[clamp(1rem,2vw,2rem)]" />', errors: [arbitrary] },
    { code: 'const Sized = () => <p className="text-[length:var(--size)]" />', errors: [arbitrary] },
    { code: 'const Sized = () => <p className="text-(length:--size)" />', errors: [arbitrary] },
    { code: 'const Label = () => <p className={cn("uppercase", { "text-[11px]": small })} />', errors: [arbitrary] },
    { code: `const Row = ({ tone }) => <p className={\`\${tone} text-xs\`} />`, errors: [floor] },
    { code: 'const Note = () => <p className="[font-size:11px]" />', errors: [property] },
    { code: "const Note = () => <p style={{ fontSize: 11 }} />", errors: [style] },
    { code: "const note = { 'fontSize': 11 }", errors: [style] },
  ],
  valid: [
    'const Meta = () => <p className="text-spec text-muted-foreground tabular-nums" />',
    'const Eyebrow = () => <p className="text-label text-muted-foreground uppercase" />',
    'const Body = () => <p className="text-body-sm md:text-body" />',
    'const Control = () => <button className="text-sm" type="button" />',
    'const Code = () => <code className="font-mono text-code" />',
    'const Tinted = () => <p className="text-[#ff0000] text-[color:var(--ring)] text-(--ring)" />',
    'const sentence = "the text-xs-like wording of a sentence"',
    "const { fontSize } = getComputedStyle(element)",
    "const Note = () => <p style={{ lineHeight: 1.5 }} />",
    "const count = 2",
  ],
})

tester.run("mono-for-code", monoForCode, {
  invalid: [
    { code: 'const Eyebrow = () => <p className="font-mono text-label text-muted-foreground uppercase" />', errors: [label, label] },
    { code: 'const Count = () => <span className="font-mono text-spec tabular-nums" />', errors: [label] },
    { code: `const Heading = ({ tone }) => <h2 className={\`font-mono uppercase \${tone}\`} />`, errors: [label] },
  ],
  valid: [
    'const Command = () => <code className="font-mono text-spec text-foreground" />',
    'const Count = () => <span className="text-spec tabular-nums" />',
    'const Eyebrow = () => <p className="text-label uppercase" />',
    "const count = 2",
  ],
})
