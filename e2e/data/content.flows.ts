import { FLOW_AREA, FLOW_STATUS, type Flow } from "./flows"

export const CONTENT_FLOWS = [
  {
    area: FLOW_AREA.CONTENT,
    id: "docs-navigation",
    outcome: "The docs follow a sidebar link through the router before the page's MDX has loaded and render the next page",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "content.spec.ts", title: "documentation loads MDX and follows a sidebar link through the router before the page's MDX has loaded" }],
  },
  {
    area: FLOW_AREA.CONTENT,
    id: "docs-search",
    outcome: "The docs search downloads the static index of the page's language and finds pages in it",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "content.spec.ts", title: "content without the Worker › the en-US docs search downloads its own static index and finds pages in it" },
      { spec: "content.spec.ts", title: "content without the Worker › the pl-PL docs search downloads its own static index and finds pages in it" },
    ],
  },
  {
    area: FLOW_AREA.CONTENT,
    id: "changelog-links",
    outcome:
      "The changelog ends every entry with a link to the pull request or commit it came from, and each released entry with a link to the release that first shipped it",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "content.spec.ts",
        title: "the changelog ends every bullet with a link to the pull request or commit it came from, named for screen readers",
      },
      {
        spec: "content.spec.ts",
        title: "the changelog links every bullet of a released entry to the first release that shipped it, and no entry merged before the first release",
      },
    ],
  },
  {
    area: FLOW_AREA.CONTENT,
    id: "blog-article",
    outcome: "A visitor opens a published article from the blog without a browser error",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "content.spec.ts", title: "blog opens a published article without browser errors" }],
  },
  {
    area: FLOW_AREA.CONTENT,
    id: "blog-highlights",
    outcome: "The blog leads with the posts FEATURED_BLOG_POSTS names, then the latest and the recently updated posts",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "blog-index.spec.ts", title: "leads the blog with the featured posts, then the latest and the recently updated posts" }],
  },
  {
    area: FLOW_AREA.CONTENT,
    id: "blog-search",
    outcome: "A visitor searches, filters by topic and sorts every post of the blog, and the address keeps the view without a hydration error",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "blog-index.spec.ts", title: "searches every post as the reader types and keeps the search in the address" },
      { spec: "blog-index.spec.ts", title: "filters the posts by topic" },
      { spec: "blog-index.spec.ts", title: "sorts the posts by their latest update and shows that date" },
      { spec: "blog-index.spec.ts", title: "hydrates a filtered address onto the prerendered blog without a browser error" },
    ],
  },
  {
    area: FLOW_AREA.CONTENT,
    id: "blog-finder",
    outcome:
      "On a wide screen the blog and its archive pages keep a finder beside the posts, with the search, the sort and the topics in place above an index of every post that scrolls on its own, every topic a popover away, and a change in it brings the reader to the matching posts",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "blog-index.spec.ts", title: "keeps the finder beside the posts from the featured posts through the archive" },
      {
        spec: "blog-index.spec.ts",
        title: "keeps the search, the sort and the topics in place while the page and the finder's index scroll, and scrolls only the index",
      },
      {
        spec: "blog-index.spec.ts",
        title: "keeps a few posts of the finder's index in view on a window 700px high, and the controls in place from 800px",
      },
      {
        spec: "blog-index.spec.ts",
        title: "keeps a few posts of the finder's index in view on a window 800px high, and the controls in place from 800px",
      },
      {
        spec: "blog-index.spec.ts",
        title: "keeps a few posts of the finder's index in view on a window 900px high, and the controls in place from 800px",
      },
      {
        spec: "blog-index.spec.ts",
        title: "keeps a few posts of the finder's index in view on a window 1100px high, and the controls in place from 800px",
      },
      { spec: "blog-index.spec.ts", title: "opens every topic from the finder in a popover and keeps the finder's controls the same height" },
      {
        spec: "blog-index.spec.ts",
        title: "brings the reader from the featured posts to the posts a finder filter matches, and clears every filter in one press",
      },
      { spec: "blog-index.spec.ts", title: "searches every post from an archive page and opens the blog at the matching posts" },
    ],
  },
  {
    area: FLOW_AREA.CONTENT,
    id: "blog-finder-phone",
    outcome: "On a phone the blog keeps its search under the header and filters the posts from a sheet, showing the active filters and clearing them in one press",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "blog-index.spec.ts",
        title: "keeps the search under the header on a phone and filters the posts from a sheet that shows and clears the active filters",
      },
    ],
  },
  {
    area: FLOW_AREA.CONTENT,
    id: "blog-more-posts",
    outcome:
      "A visitor loads more posts in place with JavaScript, or follows the archive's pages without it, and each archive page names its own canonical address and neighbours",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "blog-index.spec.ts", title: "loads the next posts in place without moving the page" },
      { spec: "blog-index.spec.ts", title: "follows the archive's pages without JavaScript" },
      { spec: "blog-index.spec.ts", title: "/blog/page/2 names its own canonical address and links the blog as its previous page" },
      { spec: "blog-index.spec.ts", title: "/ja-JP/blog/page/2 names its own canonical address and links the blog as its previous page" },
      { spec: "blog-index.spec.ts", title: "answers an archive page that does not exist with 404" },
    ],
  },
  {
    area: FLOW_AREA.CONTENT,
    id: "blog-post-rail",
    outcome: "On a wide screen a post lists every other post beside it and marks the one being read",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "blog-index.spec.ts", title: "lists every post beside a post and marks the one being read" }],
  },
  {
    area: FLOW_AREA.CONTENT,
    id: "article-reading-position",
    outcome:
      "On a wide screen the table of contents beside a blog post or a docs page marks the section being read and moves its line with the scroll, in its own list and without gliding for a reader who prefers reduced motion",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "table-of-contents.spec.ts",
        title:
          "the table of contents beside an article › marks the section the reader scrolls to in a blog post and glides its line to the next entry as the next heading rises",
      },
      {
        spec: "table-of-contents.spec.ts",
        title:
          "the table of contents beside an article › marks the section the reader scrolls to in a docs page and glides its line to the next entry as the next heading rises",
      },
      { spec: "table-of-contents.spec.ts", title: "the table of contents beside an article › keeps the current entry in view of its own list without moving the page" },
      {
        spec: "table-of-contents.spec.ts",
        title: "the table of contents beside an article › keeps the line on the current entry without gliding when the reader prefers reduced motion",
      },
    ],
  },
  {
    area: FLOW_AREA.CONTENT,
    id: "landing-notes",
    outcome: "The landing page leads its notes with the featured post and links the latest posts in its prerendered HTML",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "blog-index.spec.ts",
        title: "leads the landing page's notes with the featured post and links the latest posts, before JavaScript runs",
      },
    ],
  },
  {
    area: FLOW_AREA.CONTENT,
    id: "blog-share",
    outcome: "A post shares its canonical address on every network and by copying it, with and without JavaScript, and links each section to itself",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "blog-share.spec.ts",
        title: "shares the post's canonical URL on every network from under the title and from the end of the article",
      },
      { spec: "blog-share.spec.ts", title: "copies the canonical URL and confirms it on screen" },
      { spec: "blog-share.spec.ts", title: "shares by link without JavaScript" },
      { spec: "blog-share.spec.ts", title: "links every section of the post to itself" },
    ],
  },
  {
    area: FLOW_AREA.CONTENT,
    id: "blog-author",
    outcome:
      "A post ends with a box that introduces its author and links the author's page in the post's language, which lists every post by the author, and both describe the author to search engines as one Person",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "blog-author.spec.ts", title: "follows the byline at the end of a post to the author page, which lists the post" },
      { spec: "blog-author.spec.ts", title: "keeps the language from a Polish post to the Polish author page" },
      { spec: "blog-author.spec.ts", title: "prerenders the author page in every language with its canonical address and alternates" },
      {
        spec: "blog-author.spec.ts",
        title: "describes the author of a post as a Person that the author page describes as its ProfilePage",
      },
    ],
  },
  {
    area: FLOW_AREA.CONTENT,
    id: "blog-feeds",
    outcome: "Each language's blog names its own feed, and the feed lists exactly the published posts of that language with their dates",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "seo.spec.ts", title: "/blog names the blog feed of its own language" },
      { spec: "seo.spec.ts", title: "/ja-JP/blog names the blog feed of its own language" },
      { spec: "seo.spec.ts", title: "every blog feed lists exactly the published posts of its language with their publication dates" },
    ],
  },
  {
    area: FLOW_AREA.CONTENT,
    id: "content-without-worker",
    outcome: "Client navigation through the docs and the blog requests nothing but static files",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "content.spec.ts", title: "content without the Worker › client navigations through the docs and the blog request nothing but static files" }],
  },
  {
    area: FLOW_AREA.CONTENT,
    id: "docs-theme",
    outcome: "The theme chosen in the docs applies at once and survives a reload",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "theme.spec.ts", title: "documentation theme selector changes and persists the selected theme" }],
  },
  {
    area: FLOW_AREA.I18N,
    id: "docs-keep-locale",
    outcome: "The docs and the blog keep the visitor's language through client navigation",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "content.spec.ts", title: "Polish documentation retains its locale during navigation" },
      { spec: "locales.spec.ts", title: "pl-PL: localized docs and blog retain their language after navigation" },
    ],
  },
] as const satisfies readonly Flow[]
