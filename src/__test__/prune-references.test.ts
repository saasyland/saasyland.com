import { describe, expect, it } from "vite-plus/test"

import { type PrunedProject, pruneProject, resolveModule } from "~/scripts/prune-references"

const GONE = "src/gone.ts"
const GONE_IMPORT = 'import { gone, Gone } from "./gone"\n'
const PAGE = "src/page.tsx"
const ROUTES = "src/routes.ts"

interface Project {
  readonly deleted?: Readonly<Record<string, string>>
  readonly generated?: readonly string[]
  readonly kept: Readonly<Record<string, string>>
  readonly names?: Readonly<Record<string, readonly string[]>>
  readonly namespaces?: readonly string[]
}

const prune = ({ deleted = { [GONE]: "" }, generated = [], kept, names = {}, namespaces = [] }: Project): PrunedProject => {
  const sources: Readonly<Record<string, string>> = { ...deleted, ...kept }

  return pruneProject({
    deleted: new Set(Object.keys(deleted)),
    generated: new Set(generated),
    kept: Object.keys(kept),
    names: new Map(Object.entries(names)),
    namespaces: new Set(namespaces),
    read: (file) => sources[file] ?? "",
  })
}

const pruned = (project: Project, file = PAGE): string | undefined => prune(project).sources.get(file)

const problemsOf = (project: Project): string[] =>
  prune(project).problems.map(
    ({ column, file, line, reason }) => `${file}:${String(line)}:${String(column)} ${reason.split("`")[1] ?? reason}`,
  )

describe("resolveModule", () => {
  const files = {
    deleted: new Set(["virtual:gone"]),
    files: new Set(["src/a.ts", "src/b.tsx", "src/c/index.ts", "src/d/index.tsx", "messages/en-US/a.json"]),
  }

  it("resolves the root alias and relative paths, with or without an extension, an index file or a query", () => {
    expect(resolveModule(PAGE, "~/src/a", files)).toBe("src/a.ts")
    expect(resolveModule(PAGE, "./b", files)).toBe("src/b.tsx")
    expect(resolveModule(PAGE, "./c", files)).toBe("src/c/index.ts")
    expect(resolveModule("src/c/index.ts", "../d", files)).toBe("src/d/index.tsx")
    expect(resolveModule(PAGE, "../messages/en-US/a.json", files)).toBe("messages/en-US/a.json")
    expect(resolveModule(PAGE, "./a.ts?raw", files)).toBe("src/a.ts")
  })

  it("names a removed ambient module by its specifier, and resolves no package or missing file", () => {
    expect(resolveModule(PAGE, "virtual:gone", files)).toBe("virtual:gone")
    expect(resolveModule(PAGE, "zod", files)).toBeUndefined()
    expect(resolveModule(PAGE, "./missing", files)).toBeUndefined()
  })
})

describe("pruneProject: imports and list elements", () => {
  it("deletes every import of a removed file, side-effect imports too, and keeps the rest", () => {
    expect(pruned({ kept: { [PAGE]: `import "./gone"\n${GONE_IMPORT}import { kept } from "./kept"\n\nexport const used = kept\n` } })).toBe(
      'import { kept } from "./kept"\n\nexport const used = kept\n',
    )
  })

  it("deletes the array element that names a removed import, wherever it sits in the list", () => {
    const source = `${GONE_IMPORT}export const FIRST = [gone, 1, 2]\nexport const MIDDLE = [1, gone.value, 2]\nexport const LAST = [1, 2, ...gone]\nexport const ALL = [\n  gone,\n  Gone,\n]\n`

    expect(pruned({ kept: { [PAGE]: source } })).toBe(
      "export const FIRST = [1, 2]\nexport const MIDDLE = [1, 2]\nexport const LAST = [1, 2]\nexport const ALL = [\n  \n]\n",
    )
  })

  it("deletes the nearest element when arrays nest, and keeps a trailing comma that a kept element owns", () => {
    const source = `${GONE_IMPORT}export const MENU = [\n  { items: [{ to: gone }, { to: 1 }], key: "a" },\n  { items: [{ to: 2 }, { to: Gone }], key: "b" },\n]\n`

    expect(pruned({ kept: { [PAGE]: source } })).toBe(
      'export const MENU = [\n  { items: [{ to: 1 }], key: "a" },\n  { items: [{ to: 2 }], key: "b" },\n]\n',
    )
  })

  it("deletes the element that owns an array the pruning empties, and the group above it when that empties too", () => {
    const source = `${GONE_IMPORT}export const MENU = [{ groups: [{ items: [gone, Gone] }] }, { groups: [{ items: [1] }] }, { items: [] }]\n`

    expect(pruned({ kept: { [PAGE]: source } })).toBe("export const MENU = [{ groups: [{ items: [1] }] }, { items: [] }]\n")
  })

  it("leaves holes and other properties alone when it looks for emptied arrays", () => {
    const source = `${GONE_IMPORT}export const LIST = [, { items: [, gone] }, { ...gone }, { items: 1 }, 2]\n`

    expect(pruned({ kept: { [PAGE]: source } })).toBe("export const LIST = [, { items: [, ] }, { items: 1 }, 2]\n")
  })
})

describe("pruneProject: properties, type members and JSX", () => {
  it("deletes the nearest object property, spread or computed key when no array element encloses the reference", () => {
    const source = `${GONE_IMPORT}export const CONFIG = { a: 1, b: gone, ...Gone, [gone.key]: 2, gone, c: () => gone(), d: { e: Gone } }\n`

    expect(pruned({ kept: { [PAGE]: source } })).toBe("export const CONFIG = { a: 1, d: {  } }\n")
  })

  it("deletes the member of an interface or a type literal whose type names a removed import", () => {
    const source = `import type { Gone } from "./gone"\n\nexport interface Props {\n  readonly a: string\n  readonly b: Gone\n}\n\nexport type Pair = { a: string; b: Gone[] }\n`

    expect(pruned({ kept: { [PAGE]: source } })).toBe(
      "export interface Props {\n  readonly a: string\n}\n\nexport type Pair = { a: string; }\n",
    )
  })

  it("deletes a JSX element or child, but not the element a component returns", () => {
    const source = `${GONE_IMPORT}export const Page = () => (\n  <main>\n    <Gone />\n    {gone && <p>{gone}</p>}\n    <p title={gone}>text</p>\n    <section><Gone.Item /></section>\n  </main>\n)\nexport const Only = () => <Gone />\n`

    expect(pruned({ kept: { [PAGE]: source } })).toBe(
      "export const Page = () => (\n  <main>\n    \n    \n    \n    <section></section>\n  </main>\n)\nexport const Only = () => <Gone />\n",
    )
    expect(problemsOf({ kept: { [PAGE]: source } })).toStrictEqual([`${PAGE}:10:28 Gone`])
  })

  it("deletes a removed name from a local export list and from the files that import it", () => {
    const source = `${GONE_IMPORT}const kept = 1\n\nexport { gone, kept, Gone as Renamed }\n`
    const project = {
      kept: { [PAGE]: 'import { Renamed, kept } from "./index"\n\nexport const LIST = [Renamed, kept]\n', "src/index.ts": source },
    }

    expect(pruned(project, "src/index.ts")).toBe("const kept = 1\n\nexport { kept }\n")
    expect(pruned(project)).toBe('import { kept } from "./index"\n\nexport const LIST = [kept]\n')
  })
})

describe("pruneProject: what it cannot prune", () => {
  it("reports a reference in a statement by file, line and column, and keeps it for the type-check to show", () => {
    const source = `${GONE_IMPORT}\nexport const value = gone()\nexport const Other = () => {\n  const result = Gone.call()\n\n  return result\n}\nexport = gone\n`
    const project = { kept: { [PAGE]: source } }

    expect(problemsOf(project)).toStrictEqual([`${PAGE}:3:22 gone`, `${PAGE}:5:18 Gone`, `${PAGE}:9:10 gone`])
    expect(prune(project).problems[0]?.reason).toBe(
      "`gone` names what the removed areas take away, and no array element, object property or JSX element around it can go with it",
    )
    expect(pruned(project)).toBe(
      "export const value = gone()\nexport const Other = () => {\n  const result = Gone.call()\n\n  return result\n}\nexport = gone\n",
    )
  })

  it("does not report a reference that goes with the code around it", () => {
    const source = `${GONE_IMPORT}const helper = () => gone()\n\nexport const LIST = [{ icon: Gone, run: helper }, 1]\n`

    expect(prune({ kept: { [PAGE]: source } })).toStrictEqual({ problems: [], sources: new Map([[PAGE, "export const LIST = [1]\n"]]) })
  })

  it("sorts the problems by file, line and column", () => {
    const source = `${GONE_IMPORT}gone()\n`

    expect(problemsOf({ kept: { "src/a.ts": `${source}Gone()\n`, "src/b.ts": source } })).toStrictEqual([
      "src/a.ts:2:1 gone",
      "src/a.ts:3:1 Gone",
      "src/b.ts:2:1 gone",
    ])
  })
})

describe("pruneProject: removed exports", () => {
  const barrel = 'export { gone, Gone } from "./gone"\nexport { kept } from "./kept"\n'

  it("follows a re-export of a removed file into every file that reads it, by namespace, name or default", () => {
    const page = `import * as ROUTES from "./routes"\nimport { gone as alias } from "./routes"\nimport other, { kept } from "./routes"\n\nexport const LIST = [ROUTES.gone, ROUTES["Gone"], ROUTES.kept, alias, kept, other]\nexport type Path = typeof ROUTES.gone\n`
    const project = { kept: { [PAGE]: page, [ROUTES]: barrel, "src/kept.ts": "export const kept = 1\n" } }

    expect(pruned(project, ROUTES)).toBe('export { kept } from "./kept"\n')
    expect(pruned(project)).toBe(
      'import * as ROUTES from "./routes"\nimport other, { kept } from "./routes"\n\nexport const LIST = [ROUTES.kept, kept, other]\nexport type Path = typeof ROUTES.gone\n',
    )
    expect(problemsOf(project)).toStrictEqual([`${PAGE}:6:27 ROUTES.gone`])
  })

  it("follows a removed name into JSX, computed members and private names, and leaves members it cannot name", () => {
    const page = `import * as ROUTES from "./routes"\n\nexport const Page = () => <main><ROUTES.Gone /><ROUTES.kept /></main>\nexport const LIST = [ROUTES[0], ROUTES[key], ROUTES["kept"]]\nexport class Box {\n  #gone = 1\n  read = () => [ROUTES.#gone]\n}\nconst key = "gone"\n`
    const project = { kept: { [PAGE]: page, [ROUTES]: barrel, "src/kept.ts": "export const kept = 1\n" } }

    expect(pruned(project)).toBe(
      'import * as ROUTES from "./routes"\n\nexport const Page = () => <main><ROUTES.kept /></main>\nexport const LIST = [ROUTES[0], ROUTES[key], ROUTES["kept"]]\nexport class Box {\n  #gone = 1\n  read = () => [ROUTES.#gone]\n}\nconst key = "gone"\n',
    )
  })

  it("follows a removed default export, and re-exports through a chain of barrels", () => {
    const project = {
      kept: {
        [PAGE]: 'import { Page, value } from "./a"\n\nexport const LIST = [Page, value]\n',
        "src/a.ts": 'export { default as Page, value } from "./b"\n',
        "src/b.ts": 'export { default, value } from "./gone"\n',
      },
    }

    expect(pruned(project)).toBe("export const LIST = []\n")
    expect(pruned(project, "src/a.ts")).toBe("\n")
  })

  it("keeps following re-exports when the names it was given belong to a deleted file", () => {
    const project = {
      kept: {
        [PAGE]: 'import { gone } from "./a"\n\nexport const LIST = [gone, 1]\n',
        "src/a.ts": 'export { gone } from "./b"\n',
        "src/b.ts": 'export { gone } from "./gone"\n',
      },
      names: { [GONE]: ["A", "B", "C", "D"] },
    }

    expect(pruned(project)).toBe("export const LIST = [1]\n")
  })

  it("follows `export * as` of a removed file, and every removed name through `export *` of a kept one", () => {
    const project = {
      kept: {
        [PAGE]: 'import { GONE, LINKS, gone } from "./all"\n\nexport const LIST = [GONE.a, LINKS.gone, LINKS.kept, gone]\n',
        [ROUTES]: barrel,
        "src/all.ts": 'export * as GONE from "./gone"\nexport * from "./routes"\nexport * as LINKS from "./routes"\nexport * from "zod"\n',
        "src/kept.ts": "export const kept = 1\n",
      },
    }

    expect(pruned(project)).toBe('import { LINKS } from "./all"\n\nexport const LIST = [LINKS.kept]\n')
  })

  it("reports `export *` of a removed file, whose names it cannot follow", () => {
    expect(problemsOf({ kept: { [PAGE]: 'export * from "./gone"\n' } })).toStrictEqual([`${PAGE}:1:1 export *`])
    expect(pruned({ kept: { [PAGE]: 'export * from "./gone"\n' } })).toBe("\n")
  })

  it("keeps the type modifier of an import or export it rewrites", () => {
    const project = {
      kept: {
        [PAGE]:
          'import type { Gone, Kept } from "./types"\nexport type { Gone, Kept } from "./types"\n\nexport interface Shape {\n  readonly gone: Gone\n  readonly kept: Kept\n}\n',
        "src/types.ts": 'export type { Gone } from "./gone"\nexport type Kept = string\n',
      },
    }

    expect(pruned(project)).toBe(
      'import type { Kept } from "./types"\nexport type { Kept } from "./types"\n\nexport interface Shape {\n  readonly kept: Kept\n}\n',
    )
  })
})

describe("pruneProject: names the removed areas own in kept files", () => {
  const routes =
    'export const KEPT = "/kept"\nexport const GONE = "/gone"\nexport const API = { GONE: "/api/gone", KEPT: "/api/kept", "QUOTED": "/api/quoted" } as const\nexport const UNLISTED = [KEPT, GONE]\n'

  it("deletes each named declaration or property with every reference to it, in its file and through re-exports", () => {
    const project = {
      kept: {
        [PAGE]:
          'import * as ROUTES from "./index"\n\nexport const LIST = [ROUTES.GONE, ROUTES.KEPT, ROUTES.ENDPOINTS.GONE, ROUTES.ENDPOINTS.KEPT]\n',
        [ROUTES]: routes,
        "src/index.ts": 'export { API as ENDPOINTS, GONE, KEPT } from "./routes"\n',
      },
      names: { [ROUTES]: ["GONE", "API.GONE", "API.QUOTED"] },
    }

    expect(pruned(project, ROUTES)).toBe(
      'export const KEPT = "/kept"\nexport const API = { KEPT: "/api/kept" } as const\nexport const UNLISTED = [KEPT]\n',
    )
    expect(pruned(project, "src/index.ts")).toBe('export { API as ENDPOINTS, KEPT } from "./routes"\n')
    expect(pruned(project)).toBe('import * as ROUTES from "./index"\n\nexport const LIST = [ROUTES.KEPT, ROUTES.ENDPOINTS.KEPT]\n')
  })

  it("follows a nested property, through parentheses and satisfies, and deletes a named default export", () => {
    const source =
      'export const API = ({ AUTH: { GONE: "/gone", KEPT: "/kept" } }) satisfies object\nexport default function Page() {\n  return API.AUTH.KEPT\n}\n'

    expect(pruned({ kept: { [ROUTES]: source }, names: { [ROUTES]: ["API.AUTH.GONE", "Page"] } }, ROUTES)).toBe(
      'export const API = ({ AUTH: { KEPT: "/kept" } }) satisfies object\n',
    )
  })

  it("reports a name its file does not declare, a property it does not have and a property of what is not an object", () => {
    const source =
      'export const API = { [KEY]: 1, ...REST }\nexport let LATER\nexport function call() {}\nconst KEY = "key"\nconst REST = {}\n'
    const missing = ["MISSING", "API.MISSING", "API.KEY", "LATER.VALUE", "call.name", "KEY.VALUE"]

    expect(problemsOf({ kept: { [ROUTES]: source }, names: { [ROUTES]: missing } })).toStrictEqual(
      missing.map((name) => `${ROUTES}:1:1 ${name}`),
    )
  })
})

describe("pruneProject: dynamic imports and import types", () => {
  it("deletes the element or property whose function imports a removed file, and reports one at the top level", () => {
    const source =
      'vi.mock(import("./gone"))\n\nexport const PANELS = [{ load: () => import("./gone"), key: "a" }, { load: () => import("./kept") }]\nexport const LAZY = { load: async () => (await import("~/src/gone")).value, kept: 1 }\nexport const DYNAMIC = [import("./" + String(1))]\n'

    expect(pruned({ kept: { [PAGE]: source } })).toBe(
      'vi.mock(import("./gone"))\n\nexport const PANELS = [{ load: () => import("./kept") }]\nexport const LAZY = { kept: 1 }\nexport const DYNAMIC = [import("./" + String(1))]\n',
    )
    expect(problemsOf({ kept: { [PAGE]: source } })).toStrictEqual([`${PAGE}:1:9 import("./gone")`])
  })

  it("deletes the member whose type imports a removed file", () => {
    expect(
      pruned({ kept: { [PAGE]: 'export interface Props {\n  readonly gone: typeof import("./gone")\n  readonly kept: string\n}\n' } }),
    ).toBe("export interface Props {\n  readonly kept: string\n}\n")
  })

  it("treats a module that only a removed script declaration file declares as removed", () => {
    const deleted = {
      "src/types/gone.d.ts": 'declare module "virtual:gone" {\n  export const facts: string\n}\n',
      "src/types/shared.d.ts": 'declare module "virtual:shared" {}\n',
    }
    const kept = {
      [PAGE]: 'import { facts } from "virtual:gone"\nimport { shared } from "virtual:shared"\n\nexport const LIST = [facts, shared]\n',
      "src/types/kept.d.ts": 'declare module "virtual:shared" {\n  export const shared: string\n}\ndeclare module Legacy {}\n',
      "src/types/router.d.ts":
        'import type { Router } from "./router"\n\ndeclare module "virtual:augmented" {\n  interface Register {\n    router: Router\n  }\n}\n',
    }

    expect(pruned({ deleted, kept })).toBe('import { shared } from "virtual:shared"\n\nexport const LIST = [shared]\n')
  })
})

describe("pruneProject: message namespaces", () => {
  it("deletes each string element that names the namespace of a removed message file", () => {
    expect(
      pruned({
        kept: { [PAGE]: 'export const NAMESPACES = ["pages.kept", "pages.gone", 3, `pages.gone`, , "pages.other"]\n' },
        namespaces: ["pages.gone"],
      }),
    ).toBe('export const NAMESPACES = ["pages.kept", 3, `pages.gone`, , "pages.other"]\n')
  })
})

describe("pruneProject: what the pruning leaves unused", () => {
  it("deletes the import specifiers and module declarations left without a reference, until nothing changes", () => {
    const source = `import Default, * as Icons from "icons"\nimport Logo, { Star, Moon } from "logos"\nimport { untouched } from "other"\n${GONE_IMPORT}\ntype Shape = Record<string, unknown>\nconst ENTRY: Shape = { icon: Star, label: helper(), logo: Default }\nfunction helper() {\n  return Moon\n}\n\nexport const LIST: Shape[] = [{ ...ENTRY, to: gone }, { icon: Icons.Sun }, { icon: Logo }]\n`

    expect(pruned({ kept: { [PAGE]: source } })).toBe(
      'import * as Icons from "icons"\nimport Logo from "logos"\nimport { untouched } from "other"\ntype Shape = Record<string, unknown>\nexport const LIST: Shape[] = [{ icon: Icons.Sun }, { icon: Logo }]\n',
    )
  })

  it("deletes the locals of a function left without a reference, and the destructured names among them", () => {
    const source = `${GONE_IMPORT}export const Page = () => {\n  const format = useFormat()\n  const { a, b: [first], ...rest } = useValues()\n  const { c } = useMore()\n  const { d: { e } } = useNested()\n\n  return [gone(format, a, c, e), first, rest]\n}\n`

    expect(pruned({ kept: { [PAGE]: source } })).toBe(
      "export const Page = () => {\n  const { b: [first], ...rest } = useValues()\n  return [first, rest]\n}\n",
    )
  })

  it("keeps an exported declaration and what it uses, and every overload of a function it keeps", () => {
    const source = `${GONE_IMPORT}const SHARED = 1\n\nexport const KEPT = SHARED\nexport const LIST = [gone, SHARED]\nfunction format(value: string): string\nfunction format(value: number): string\nfunction format(value: unknown): string {\n  return String(value)\n}\nexport const OTHER = [{ format, gone }]\n`

    expect(pruned({ kept: { [PAGE]: source } })).toBe(
      "const SHARED = 1\n\nexport const KEPT = SHARED\nexport const LIST = [SHARED]\nexport const OTHER = []\n",
    )
  })
})

describe("pruneProject: which files it reads", () => {
  it("prunes only the code files that are not generated, and reports no file the removal leaves untouched", () => {
    const project = {
      generated: ["src/routeTree.gen.ts"],
      kept: { [PAGE]: "export const kept = 1\n", "messages/en-US/page.json": "{}", "src/routeTree.gen.ts": GONE_IMPORT },
    }

    expect(prune(project)).toStrictEqual({ problems: [], sources: new Map() })
  })
})
