import { Bold, Code, Eye, Heading, ImageIcon, Italic, LayoutGrid, LinkIcon, List, Quote, Underline, Users } from "lucide-react"

export const DEMO_BLOG_STATS = {
  draftsPending: 12,
  publishedPosts: 142,
  subscribers: 8409,
  subscribersGrowth: 0.042,
  totalViews: 45_200,
  viewsGrowth: 0.125,
} as const

export const DUMMY_POSTS = [
  {
    author: {
      initials: "MK",
      name: "Marta Kowalczyk",
    },
    date: "2024-10-24T00:00:00.000Z",
    id: "post-1",
    readTime: 8,
    status: "published",
    views: 12_400,
  },
  {
    author: {
      initials: "DO",
      name: "Dele Okonkwo",
    },
    date: "",
    id: "post-2",
    readTime: undefined,
    status: "draft",
    views: undefined,
  },
  {
    author: {
      initials: "HN",
      name: "Hana Nakamura",
    },
    date: "2024-10-18T00:00:00.000Z",
    id: "post-3",
    readTime: 6,
    status: "published",
    views: 8100,
  },
  {
    author: {
      initials: "MK",
      name: "Marta Kowalczyk",
    },
    date: "",
    id: "post-4",
    readTime: undefined,
    status: "scheduled",
    views: undefined,
  },
  {
    author: {
      initials: "RS",
      name: "Rafael Santos",
    },
    date: "2024-10-12T00:00:00.000Z",
    id: "post-5",
    readTime: 12,
    status: "published",
    views: 5600,
  },
  {
    author: {
      initials: "DO",
      name: "Dele Okonkwo",
    },
    date: "2024-10-05T00:00:00.000Z",
    id: "post-6",
    readTime: 5,
    status: "published",
    views: 22_100,
  },
] as const

export const ADMIN_BLOG_TRENDING_STATS = [
  { icon: Eye, key: "totalViews" },
  { icon: Users, key: "subscribers" },
] as const

export const ADMIN_BLOG_FILTERS = ["all", "published", "drafts", "scheduled"] as const

export const ADMIN_BLOG_VIEWS = [
  { icon: LayoutGrid, id: "grid", labelKey: "labels.gridView" },
  { icon: List, id: "table", labelKey: "labels.tableView" },
] as const

export const ADMIN_BLOG_TOOLBAR_GROUPS = [
  {
    id: "text",
    tools: [
      { icon: Bold, id: "bold" },
      { icon: Italic, id: "italic" },
      { icon: Underline, id: "underline" },
    ],
  },
  {
    id: "blocks",
    tools: [
      { icon: Heading, id: "heading" },
      { icon: Quote, id: "quote" },
      { icon: Code, id: "code" },
    ],
  },
  {
    id: "media",
    tools: [
      { icon: LinkIcon, id: "link" },
      { icon: ImageIcon, id: "image" },
    ],
  },
] as const
