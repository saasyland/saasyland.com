import { RuleTester } from "vite-plus/lint/plugins-dev"

import { noLiteralData } from "~/scripts/admin-data-lint-plugin"

const tester = new RuleTester({ languageOptions: { parserOptions: { lang: "tsx" } } })

const series = { messageId: "series" }
const records = { messageId: "records" }
const contact = { messageId: "contact" }
const date = { messageId: "date" }
const path = { messageId: "path" }
const name = { messageId: "name" }
const statistic = { messageId: "statistic" }

tester.run("no-literal-data", noLiteralData, {
  invalid: [
    { code: "const SERIES = [0.22, 0.24, 0.23, 0.3]", errors: [series] },
    { code: "const ticks = [-10, 20]", errors: [series] },
    { code: "const Bars = () => <Chart data={[45, 35, 60]} />", errors: [series] },
    { code: "const ROWS = [{ amount: 199, id: 'p1' }, { amount: 9.5, id: 'p2' }]", errors: [records] },
    { code: "const ROLES = [{ id: 'r1', usersCount: 3 }, { id: 'r2', usersCount: 12 }]", errors: [records] },
    { code: "const invite = { email: 'alex.chen@example.com' }", errors: [contact] },
    { code: "const placed = new Date('2024-11-25T00:00:00.000Z')", errors: [date] },
    { code: "const LINE = 'M0,180 C100,150 200,200 300,120'", errors: [path] },
    { code: "const DEMO_BLOG_STATS = { posts: 142 }", errors: [name] },
    { code: "const DUMMY_POSTS = []", errors: [name] },
    { code: "const sampleRows = []", errors: [name] },
    { code: "const ITEMS_PLACEHOLDER = '0'", errors: [name] },
    { code: "const STATS = [{ key: 'mrr', order: 10, useValue: () => 12_450 }]", errors: [statistic] },
    { code: "const STATS = [{ key: 'mrr', order: 10, useValue() { return useState(1)[0] } }]", errors: [statistic] },
  ],
  valid: [
    "const Stat = ({ value }) => <dd>{format.number(value)}</dd>",
    "const PAGINATION = { pageIndex: 0, pageSize: 5 }",
    "const TABS = ['general', 'security']",
    "const ENTRIES = [{ key: 'users', order: 10 }, { key: 'products', order: 20 }]",
    "const COLUMNS = [{ id: 'name', width: 'w-8' }, { id: 'status', width: 'w-12' }]",
    "const Avatar = () => <img height={32} width={32} />",
    "const Margin = () => <div className='m-4 -mt-2 p-0' />",
    "const VideoPlaceholderSwitch = ({ placeholder }) => placeholder",
    "const Field = () => <Input placeholder={t('search')} />",
    "const STATS = [{ key: 'users', order: 10, useValue: () => useSuspenseQuery(getUsersQuery).data.total }]",
    "const STATS = [{ key: 'orders', order: 20, useValue() { return useQuery(ordersQuery).data?.total } }]",
    "const settings = { [key]: 1, 'order': 2 }",
  ],
})
