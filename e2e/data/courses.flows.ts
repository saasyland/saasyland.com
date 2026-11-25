import { FLOW_AREA, FLOW_STATUS, type Flow } from "./flows"

const BUILD_COURSE = {
  spec: "course-admin.spec.ts",
  title: "an administrator builds a course whose free lesson visitors can watch",
} as const

const TRANSLATE_COURSE = {
  spec: "course-admin.spec.ts",
  title: "an administrator translates a course from one language control and visitors read it in their language",
} as const

const WRITE_LESSON = {
  spec: "course-admin.spec.ts",
  title: "an administrator writes a lesson, swaps its video and adds materials that visitors download",
} as const

const ORDER_CATALOGUE = {
  spec: "course-admin.spec.ts",
  title: "an administrator orders the catalogue by dragging a course and with the keyboard, then deletes the selected courses together",
} as const

const PAID_MATERIALS = {
  spec: "course-materials.spec.ts",
  title: "lesson materials › a Complete licence holder downloads a paid lesson's materials and sees a lesson being recorded",
} as const

const COMPLETE_LEARNER = {
  spec: "course-pages.spec.ts",
  title: "lesson pages for each viewer › a Complete learner sees what each kind of lesson offers",
} as const

const FRESH_COURSE = {
  spec: "course-pages.spec.ts",
  title: "a course created and renamed in the admin reaches the landing page and the catalogue without a deploy",
} as const

const ORDER_CURRICULUM = {
  spec: "course-curriculum.spec.ts",
  title:
    "an administrator orders chapters and lessons by dragging them, a lesson into another chapter too, and visitors see the new order",
} as const

const COURSE_COVER = {
  spec: "course-cover.spec.ts",
  title: "an administrator uploads a course cover that the catalogue, the landing page and the course page show, then removes it",
} as const

const CUSTOMER_KEPT_OUT = {
  spec: "course-videos.spec.ts",
  title: "lesson videos › a customer cannot open the course admin or stream a video without a signed path",
} as const

const UPLOAD_VIDEO = {
  spec: "course-videos.spec.ts",
  title:
    "lesson videos › an administrator drops a recording on a lesson, the encoder publishes it, the lesson plays it through a signed path and the video can be deleted",
} as const

const LIBRARY_VIDEO = {
  spec: "course-videos.spec.ts",
  title: "lesson videos › an administrator puts a video from the library on a lesson and visitors watch it",
} as const

const TEXT_LESSON = {
  spec: "course-videos.spec.ts",
  title: "lesson videos › an administrator makes a text lesson that visitors read without a player or a recording notice",
} as const

export const COURSES_FLOWS = [
  {
    area: FLOW_AREA.COURSES,
    id: "course-sitemap",
    outcome:
      "Search engines find the catalogue, every published course and every lesson a signed-out visitor may watch in the course sitemap, in every locale with the day each last changed, and no other lesson",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "course-seo.spec.ts",
        title:
          "the course sitemap lists the catalogue, the course and its free lesson in every locale with the day each last changed, and no lesson a visitor may not watch",
      },
    ],
  },
  {
    area: FLOW_AREA.COURSES,
    id: "course-structured-data",
    outcome:
      "A course page describes its course as a Course in structured data in its language, and a lesson that needs an account or a licence, or is being recorded, carries noindex",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "course-seo.spec.ts",
        title: "a course page describes its course in structured data and a lesson outside the sitemap stays out of search results",
      },
    ],
  },
  {
    area: FLOW_AREA.COURSES,
    id: "watch-free-lesson",
    outcome: "A visitor finds the course on /courses, starts it and watches the free lesson through a signed playlist",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "courses.spec.ts", title: "courses › a visitor finds the course and watches its free lesson" }],
  },
  {
    area: FLOW_AREA.COURSES,
    id: "account-lesson",
    outcome: "A visitor who opens an account lesson is invited to create a free account, and one who has an account signs in from it and comes back to watch it",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "courses.spec.ts",
        title:
          "courses › a visitor is invited to create a free account on an account lesson, and one who has an account signs in and comes back to watch it",
      },
    ],
  },
  {
    area: FLOW_AREA.COURSES,
    id: "paid-lesson-offer",
    outcome: "A paid lesson prices Complete, and its offer on /app/license keeps the lesson; a guest gets there through sign-up or signs in instead",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "course-access.spec.ts", title: "course access through a licence › a customer without Complete is offered it on a paid lesson" },
      {
        spec: "course-access.spec.ts",
        title: "a visitor sees the price on a paid lesson, and one who has Complete signs in and comes back to it",
      },
    ],
  },
  {
    area: FLOW_AREA.COURSES,
    id: "paid-lesson-back-after-checkout",
    outcome: "A guest who buys Complete from a paid lesson signs up, checks out and is offered the way back to the lesson once the licence is active",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "checkout-funnel.spec.ts",
        title:
          "checkout funnel › a paid lesson's offer carries the lesson through sign-up and checkout, and comes back to it once the licence is active",
      },
    ],
  },
  {
    area: FLOW_AREA.COURSES,
    id: "locked-courses-in-app",
    outcome: "/app tells a customer without Complete how many lessons in how many courses they cannot open yet, with a link to each course",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "course-access.spec.ts",
        title: "course access through a licence › a customer without Complete sees the locked courses beside the licence offer",
      },
    ],
  },
  {
    area: FLOW_AREA.COURSES,
    id: "complete-watches-paid",
    outcome: "A Complete licence holder streams a paid lesson through a signed playlist",
    status: FLOW_STATUS.COVERED,
    tests: [COMPLETE_LEARNER],
  },
  {
    area: FLOW_AREA.COURSES,
    id: "agency-watches-paid",
    outcome: "An Agency licence holder opens and streams every paid lesson",
    reason: "No seeded account holds Agency.",
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.COURSES,
    id: "core-refused-paid",
    outcome: "A Core licence holder is offered Complete on a paid lesson and receives no signed playlist",
    reason: "The paid-lesson specs sign in as a customer without a licence.",
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.COURSES,
    id: "refunded-loses-lessons",
    outcome: "A refunded or revoked Complete licence no longer opens paid lessons or their materials",
    reason: "No spec refunds or revokes a licence.",
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.COURSES,
    id: "admin-watches-every-lesson",
    outcome: "An admin streams a paid lesson without a licence",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "courses.spec.ts", title: "courses › an administrator can watch every lesson" }],
  },
  {
    area: FLOW_AREA.COURSES,
    id: "free-materials",
    outcome: "A visitor downloads a free lesson's file through a signed path with its name and type, and follows its link materials",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "course-materials.spec.ts", title: "lesson materials › a visitor downloads the materials of a free lesson through a signed, expiring path" },
    ],
  },
  {
    area: FLOW_AREA.COURSES,
    id: "locked-materials",
    outcome: "A visitor and a customer without Complete see a paid lesson's materials listed without a download link",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "course-materials.spec.ts",
        title: "lesson materials › a visitor and a customer without Complete see a paid lesson's materials but cannot download them",
      },
    ],
  },
  {
    area: FLOW_AREA.COURSES,
    id: "paid-materials",
    outcome: "A Complete licence holder downloads a paid lesson's file",
    status: FLOW_STATUS.COVERED,
    tests: [PAID_MATERIALS],
  },
  {
    area: FLOW_AREA.COURSES,
    id: "lesson-being-recorded",
    outcome: "A lesson without a video says that its recording is on its way and streams nothing",
    status: FLOW_STATUS.COVERED,
    tests: [PAID_MATERIALS, WRITE_LESSON],
  },
  {
    area: FLOW_AREA.COURSES,
    id: "text-lesson",
    outcome: "A visitor reads a text lesson without a player, a recording notice or Coming soon, and its course is not listed as being recorded",
    status: FLOW_STATUS.COVERED,
    tests: [TEXT_LESSON],
  },
  {
    area: FLOW_AREA.COURSES,
    id: "courses-in-workspace",
    outcome: "The workspace sidebar links to the courses and shows how many of the published lessons the customer has finished",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "course-access.spec.ts",
        title: "course access through a licence › the workspace sidebar links to the courses with the lessons the customer has finished",
      },
    ],
  },
  {
    area: FLOW_AREA.COURSES,
    id: "lesson-progress",
    outcome: "A signed-in learner marks a lesson complete, and the course shows it as complete after a reload",
    reason: "The spec finds the Mark as complete button but never presses it.",
    status: FLOW_STATUS.MISSING,
    tests: [{ spec: "courses.spec.ts", title: "courses › an administrator can watch every lesson" }],
  },
  {
    area: FLOW_AREA.COURSES,
    id: "lesson-resume",
    outcome: "The playback position is saved while a signed-in learner watches, and the lesson resumes there",
    reason: "No spec plays a lesson long enough to save its position.",
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.COURSES,
    id: "draft-hidden",
    outcome: "A draft course or lesson answers 404 to visitors and customers",
    reason: "The specs open published courses only.",
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.COURSES,
    id: "course-showcase",
    outcome:
      "The landing page's course block lists each published course with its lessons by title: open lessons link to their pages, locked ones say what unlocks them, lessons coming soon say so and are not links, and a link to the course counts the rest",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "landing.spec.ts", title: "landing page › course showcase lists real courses with their open and locked lessons" }],
  },
  {
    area: FLOW_AREA.COURSES,
    id: "lesson-views",
    outcome:
      "A visitor, a customer without Complete and a Complete learner each get the player, the sign-in, the Complete offer or the recording notice that every kind of lesson promises them",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "course-pages.spec.ts", title: "lesson pages for each viewer › a visitor sees what each kind of lesson offers" },
      { spec: "course-pages.spec.ts", title: "lesson pages for each viewer › a customer without Complete sees what each kind of lesson offers" },
      COMPLETE_LEARNER,
    ],
  },
  {
    area: FLOW_AREA.COURSES,
    id: "course-curriculum",
    outcome:
      "The course page shows the level, the outcomes and the prerequisites, and lists each chapter as an accordion whose lessons say who can watch them and whether they are coming soon",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "course-pages.spec.ts",
        title: "course and lesson pages › the course page lists each chapter as an accordion with each lesson's access and recording",
      },
      {
        spec: "course-pages.spec.ts",
        title: "course and lesson pages › the curriculum sets each lesson's icon, number and lock and each chapter's number on the centre and baseline of its title's first line",
      },
    ],
  },
  {
    area: FLOW_AREA.COURSES,
    id: "course-panel",
    outcome: "On a wide screen the course panel stays below the header with the same gap while the visitor scrolls",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "course-pages.spec.ts", title: "course and lesson pages › the unlock panel sticks below the header with the same gap at every scroll" }],
  },
  {
    area: FLOW_AREA.COURSES,
    id: "lesson-seek",
    outcome: "A key moment or a transcript line moves the lesson's player to its time",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "course-pages.spec.ts", title: "course and lesson pages › key moments and transcript lines seek the player" }],
  },
  {
    area: FLOW_AREA.COURSES,
    id: "lesson-contents",
    outcome:
      "The course contents sit beside the lesson on a wide screen, where the learner can hide and show them, and open in a sheet on a phone that closes on the next lesson",
    status: FLOW_STATUS.COVERED,
    tests: [
      { spec: "course-pages.spec.ts", title: "course and lesson pages › on a phone the course contents open in a sheet" },
      {
        spec: "course-pages.spec.ts",
        title: "course and lesson pages › on a wide screen the course contents sit beside the lesson and can be hidden",
      },
    ],
  },
  {
    area: FLOW_AREA.I18N,
    id: "courses-localized",
    outcome: "The course page, its lessons and the landing page's course block read in the visitor's language",
    status: FLOW_STATUS.COVERED,
    tests: [{ spec: "course-pages.spec.ts", title: "course and lesson pages › the course and its lessons read in Polish" }],
  },
  {
    area: FLOW_AREA.SECURITY,
    id: "signed-media",
    outcome: "A video stream or lesson download without a valid signature is refused",
    status: FLOW_STATUS.COVERED,
    tests: [
      CUSTOMER_KEPT_OUT,
      UPLOAD_VIDEO,
      { spec: "course-materials.spec.ts", title: "lesson materials › a visitor downloads the materials of a free lesson through a signed, expiring path" },
    ],
  },
  {
    area: FLOW_AREA.SECURITY,
    id: "expired-signed-path",
    outcome: "A signed video or download path past its expiry is refused",
    reason: "The specs forge a signature; none presents an expired one.",
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.ADMIN_COURSES,
    id: "admin-courses-grid",
    outcome:
      "/admin/courses finds a course by its slug, filters the catalogue by status on the server and shows the filtered empty state, and keeps a hidden column after a reload until the layout is reset",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "course-admin.spec.ts",
        title:
          "an administrator finds a course by its slug, filters the catalogue by status, hides a column and keeps the layout after a reload",
      },
    ],
  },
  {
    area: FLOW_AREA.ADMIN_COURSES,
    id: "admin-course-menu",
    outcome: "A course's ⋯ menu opens its public page in a new tab once it is published, copies its link, opens its editor and deletes it after a confirmation",
    status: FLOW_STATUS.COVERED,
    tests: [BUILD_COURSE],
  },
  {
    area: FLOW_AREA.ADMIN_COURSES,
    id: "admin-create-course",
    outcome: "The admin creates a published course with a chapter and a free lesson, puts a video from the library on it, and a visitor plays that lesson",
    status: FLOW_STATUS.COVERED,
    tests: [BUILD_COURSE],
  },
  {
    area: FLOW_AREA.ADMIN_COURSES,
    id: "admin-translate-course",
    outcome: "The admin fills a course in another language from the form's language control and in the all-languages panel, and the course page shows each translation",
    status: FLOW_STATUS.COVERED,
    tests: [TRANSLATE_COURSE],
  },
  {
    area: FLOW_AREA.ADMIN_COURSES,
    id: "admin-edit-lesson",
    outcome: "The admin writes a lesson's description and key moments, and the lesson page shows them",
    reason: "The spec checks the editor's preview and the saved notice, not the lesson page.",
    status: FLOW_STATUS.MISSING,
    tests: [WRITE_LESSON],
  },
  {
    area: FLOW_AREA.ADMIN_COURSES,
    id: "admin-replace-video",
    outcome: "A lesson without a video shows visitors the recording notice, and putting a video from the library on it plays the video",
    status: FLOW_STATUS.COVERED,
    tests: [WRITE_LESSON, LIBRARY_VIDEO],
  },
  {
    area: FLOW_AREA.ADMIN_COURSES,
    id: "admin-upload-material",
    outcome: "A file the admin uploads to a free lesson can be downloaded by a visitor",
    status: FLOW_STATUS.COVERED,
    tests: [WRITE_LESSON],
  },
  {
    area: FLOW_AREA.ADMIN_COURSES,
    id: "admin-link-material",
    outcome: "A link the admin adds to a lesson appears on the lesson page with its address",
    status: FLOW_STATUS.COVERED,
    tests: [WRITE_LESSON],
  },
  {
    area: FLOW_AREA.ADMIN_COURSES,
    id: "admin-delete-course",
    outcome: "Deleting a course removes it from the table, and its materials' download paths answer 404",
    status: FLOW_STATUS.COVERED,
    tests: [BUILD_COURSE, WRITE_LESSON],
  },
  {
    area: FLOW_AREA.ADMIN_COURSES,
    id: "admin-import-courses",
    outcome:
      "The admin checks a course file in a dry run, imports it, visitors find its courses being recorded, and importing the same file again changes nothing",
    status: FLOW_STATUS.COVERED,
    tests: [
      {
        spec: "course-import.spec.ts",
        title: "an administrator imports the curriculum, visitors see it being recorded, and a second import changes nothing",
      },
    ],
  },
  {
    area: FLOW_AREA.ADMIN_COURSES,
    id: "admin-export-courses",
    outcome: "The admin exports every course, or one, as a JSON file that imports back into a site without changes",
    reason: "The import spec reads the checked-in curriculum; no spec presses Export or imports what it downloaded.",
    status: FLOW_STATUS.MISSING,
    tests: [
      {
        spec: "course-import.spec.ts",
        title: "an administrator imports the curriculum, visitors see it being recorded, and a second import changes nothing",
      },
    ],
  },
  {
    area: FLOW_AREA.ADMIN_COURSES,
    id: "admin-update-course",
    outcome: "The admin edits a course's title, summary, level, outcomes and status, the course page follows, and unpublishing hides it",
    reason: "The spec renames a course; none edits its summary, level, outcomes or status after creating it.",
    status: FLOW_STATUS.MISSING,
    tests: [FRESH_COURSE],
  },
  {
    area: FLOW_AREA.ADMIN_COURSES,
    id: "admin-course-cover",
    outcome:
      "The admin uploads a cover for a course, and /courses, the landing page's course block and the course page with its link preview show it; removing it brings back the icon on a teal glow",
    status: FLOW_STATUS.COVERED,
    tests: [COURSE_COVER],
  },
  {
    area: FLOW_AREA.ADMIN_COURSES,
    id: "admin-course-live",
    outcome: "A course the admin publishes, moves to the top and renames shows its new title on the landing page and on /courses without a deploy",
    status: FLOW_STATUS.COVERED,
    tests: [FRESH_COURSE],
  },
  {
    area: FLOW_AREA.ADMIN_COURSES,
    id: "admin-reorder-courses",
    outcome:
      "Dragging a course by its handle, or pressing the down or up arrow on its focused handle, moves it in /admin/courses, keeps the new place after a reload and changes its place on /courses",
    status: FLOW_STATUS.COVERED,
    tests: [ORDER_CATALOGUE],
  },
  {
    area: FLOW_AREA.ADMIN_COURSES,
    id: "admin-delete-selected-courses",
    outcome: "Selecting courses and pressing Delete in the selection bar removes all of them after one confirmation",
    status: FLOW_STATUS.COVERED,
    tests: [ORDER_CATALOGUE],
  },
  {
    area: FLOW_AREA.ADMIN_COURSES,
    id: "admin-edit-chapter",
    outcome: "Renaming a chapter shows its new title on the course page",
    reason: "No spec edits a chapter after creating it.",
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.ADMIN_COURSES,
    id: "admin-reorder-chapters",
    outcome: "Dragging a chapter, with the mouse or the keyboard, moves it with its lessons, and the course follows after a reload",
    status: FLOW_STATUS.COVERED,
    tests: [ORDER_CURRICULUM],
  },
  {
    area: FLOW_AREA.ADMIN_COURSES,
    id: "admin-delete-chapter",
    outcome: "Deleting a chapter removes it and its lessons from the course",
    reason: "No spec deletes a chapter.",
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.ADMIN_COURSES,
    id: "admin-reorder-lessons",
    outcome: "Dragging a lesson, with the mouse or the keyboard, moves it within its chapter or into another one, and the lesson page's previous and next links follow",
    status: FLOW_STATUS.COVERED,
    tests: [ORDER_CURRICULUM],
  },
  {
    area: FLOW_AREA.ADMIN_COURSES,
    id: "admin-delete-lesson",
    outcome: "Deleting a lesson removes it from the course, and its page answers 404",
    reason: "No spec deletes a lesson.",
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.ADMIN_COURSES,
    id: "admin-move-material",
    outcome: "Dragging a material by its handle above another one changes its place on the lesson page",
    status: FLOW_STATUS.COVERED,
    tests: [WRITE_LESSON],
  },
  {
    area: FLOW_AREA.ADMIN_COURSES,
    id: "admin-edit-material",
    outcome: "Renaming a material from its ⋯ menu changes its title on the lesson page",
    reason: "No spec renames a material after adding it.",
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.ADMIN_COURSES,
    id: "admin-delete-material",
    outcome: "Deleting a material removes it from the lesson, and its download path answers 404",
    reason: "The specs delete the whole course, never one material.",
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.ADMIN_COURSES,
    id: "admin-upload-limits",
    outcome: "A file over the size limit or of a type outside the allowed list is refused, and so are uploads over the per-minute limit",
    reason: "The spec uploads one allowed file.",
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.ADMIN_COURSES,
    id: "admin-slug-taken",
    outcome: "A course or lesson slug already in use is refused with a field error",
    reason: "Every spec makes up a new slug.",
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.ADMIN_COURSES,
    id: "admin-courses-refused",
    outcome:
      "A customer and a signed-out visitor are refused by every course, chapter, lesson, material, import and export server function, and nothing changes",
    reason: "No spec calls a course-editing server function without the permission.",
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.ADMIN_VIDEOS,
    id: "admin-upload-video",
    outcome:
      "The admin drops a recording file on a lesson, it uploads in parts and waits for the encoder, and once encoded the lesson editor plays it through a signed playlist whose segments may be cached, while a forged signature is refused",
    status: FLOW_STATUS.COVERED,
    tests: [UPLOAD_VIDEO],
  },
  {
    area: FLOW_AREA.ADMIN_VIDEOS,
    id: "admin-delete-video",
    outcome: "Deleting a lesson's only video removes it and shows visitors the recording notice again",
    status: FLOW_STATUS.COVERED,
    tests: [UPLOAD_VIDEO],
  },
  {
    area: FLOW_AREA.ADMIN_VIDEOS,
    id: "admin-text-lesson",
    outcome: "The admin adds a lesson without a video, which the curriculum lists as a text lesson",
    status: FLOW_STATUS.COVERED,
    tests: [TEXT_LESSON],
  },
  {
    area: FLOW_AREA.ADMIN_VIDEOS,
    id: "admin-resume-upload",
    outcome: "An upload cut off midway continues from the parts already stored when the same file is chosen again",
    reason: "No spec interrupts an upload; the unit tests of useVideoUpload and startVideoUpload cover the resume.",
    status: FLOW_STATUS.MISSING,
  },
  {
    area: FLOW_AREA.ADMIN_VIDEOS,
    id: "admin-videos-refused",
    outcome: "A customer and a signed-out visitor are refused by every upload and video server function, and nothing changes",
    reason: "The spec checks the route guard and an unsigned stream; no spec calls the upload's server functions as a customer.",
    status: FLOW_STATUS.MISSING,
    tests: [CUSTOMER_KEPT_OUT],
  },
] as const satisfies readonly Flow[]
