import { RuleTester } from "vite-plus/lint/plugins-dev"

import { noClockOrLocaleInRender } from "~/scripts/hydration-lint-plugin"

const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "tsx" } } })

const clock = { messageId: "clock" }
const locale = { messageId: "locale" }

tester.run("no-clock-or-locale-in-render", noClockOrLocaleInRender, {
  invalid: [
    { code: "const Footer = () => <p>{new Date().getFullYear()}</p>", errors: [clock] },
    { code: "const Panel = () => { const [startedAt] = useState(Date.now); return startedAt }", errors: [clock] },
    { code: "const Elapsed = () => <p>{Date.now() - start}</p>", errors: [clock] },
    { code: "const Stamp = () => { const now = useMemo(() => Date.now(), []); return now }", errors: [clock] },
    {
      code: "const Sessions = ({ sessions }) => sessions.map((session) => format.relativeTime(session.updatedAt, new Date()))",
      errors: [clock],
    },
    { code: "const YEAR = new Date().getFullYear()", errors: [clock] },
    { code: "const Amount = ({ value }) => <span>{value.toLocaleString()}</span>", errors: [locale] },
    { code: "const label = (date) => date.toLocaleDateString()", errors: [locale] },
    { code: "const Time = ({ at }) => <time>{at.toLocaleTimeString()}</time>", errors: [locale] },
    { code: "const Wrapped = () => { const onTick = () => Date.now(); return render(() => new Date()) }", errors: [clock] },
  ],
  valid: [
    "const Published = ({ date }) => <p>{format.dateTime(new Date(date), 'calendarDate')}</p>",
    "const Activity = ({ dataUpdatedAt, session }) => <p>{format.relativeTime(session.updatedAt, dataUpdatedAt)}</p>",
    "const Save = () => <button onPress={() => save(Date.now())} />",
    "const Save = () => <button onClick={function () { save(new Date()) }} />",
    "const Timer = () => { useEffect(() => { setNow(Date.now()) }, []); return undefined }",
    "const Timer = () => { useLayoutEffect(() => { setNow(Date.now()) }, []); return undefined }",
    "const useSave = () => useCallback(() => Date.now(), [])",
    "const Delay = () => { setTimeout(() => setNow(Date.now()), 0); return undefined }",
    "const Tick = () => { globalThis.setInterval(() => setNow(Date.now()), 0); return undefined }",
    "const Frame = () => { requestAnimationFrame(() => setNow(Date.now())); return undefined }",
    "const Listen = () => { window.addEventListener('focus', () => setNow(Date.now())); return undefined }",
    "const Options = () => useQuery({ queryFn: () => read(Date.now()) })",
    "const Options = () => useMutation({ mutationFn: () => write(new Date()) })",
    "const Options = () => useMutation({ onSuccess: () => toast(new Date().toISOString()) })",
    "const Options = () => useMutation({ onSettled() { log(Date.now()) } })",
    "const Options = () => useMutation({ 'onError': () => log(Date.now()) })",
    "const Form = () => { const onSubmit = () => submit(Date.now()); return onSubmit }",
    "const Nested = () => <button onPress={() => [1].map(() => Date.now())} />",
  ],
})
