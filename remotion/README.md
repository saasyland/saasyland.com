# Landing page videos

This directory is a separate Remotion project. Finished videos and posters live in `src/presentation/assets/motion/` at the repository root. Vite emits them with content hashes under `/assets/` for immutable caching. The app does not import Remotion, and its TypeScript and Vite checks exclude this directory.

Keep this source, its configuration and `package-lock.json` in Git. Keep the published `.webm` and `.webp` files in `../src/presentation/assets/motion/` tracked too: deployments serve them without running a renderer. Local `node_modules/`, `build/`, `dist/`, `out/` and `.cache/` directories are ignored. The root ignore rules also cover secrets and editor files here.

The separate package keeps the renderer, browser types and Remotion-specific lint rules outside the Cloudflare application. It uses npm's lockfile independently of the app's Bun lockfile. CI checks and bundles this source when it or the shared locale configuration changes.

GitHub's Dependabot alerts read this project's `package-lock.json`. Keep `npm audit` clean: upgrade the Remotion packages together to the latest release, and refresh the other packages within their ranges with `npm update`. The `minimatch` override under `@typescript-eslint/typescript-estree` exists because `@remotion/eslint-config-flat` pins `typescript-eslint` 8.71.2, whose parser asks for a `minimatch` 10 release affected by GHSA-g3hv-75wg-m249. Delete it once `@remotion/eslint-config-flat` depends on a `typescript-eslint` release that contains [typescript-eslint/typescript-eslint#13145](https://github.com/typescript-eslint/typescript-eslint/pull/13145).

Composition IDs match their source filenames and the names passed to `ConceptLoop`, except `course-tour`, which `CourseShowcase` plays on request in the landing page's course block.

| Composition     | Duration | Poster frame |
| --------------- | -------- | ------------ |
| `app-tour`      | 10 s     | 0            |
| `cost-curve`    | 8 s      | 200          |
| `merge-gate`    | 8 s      | 212          |
| `locale-format` | 8 s      | 200          |
| `scaffold-cli`  | 8 s      | 400          |
| `coverage-run`  | 11 s     | 570          |
| `page-designer` | 10 s     | 0            |
| `record-audit`  | 8 s      | 60           |
| `course-tour`   | 22 s     | 0            |

Each composition's width and height come from `LANDING_VIDEO_SIZES` in `../src/data/landing-videos.ts`. `src/root.tsx` registers the compositions from it, and the app's `ConceptLoop` and `CourseShowcase` read the same table for the `width`, `height` and full-size `srcset` entry of each video, so a size is changed in one place. The app's `landing-videos.test.ts` fails when a poster file no longer has its composition's size, or when a responsive poster's width differs from the width in its file name.

## Editing

```sh
cd remotion
npm ci
npm run check
npm run dev
```

Studio uses port 3001 so it can run beside the app on port 3000. `npm run format` formats this project. `npm run bundle` checks the composition bundle and writes it to the ignored `build/` directory; it does not render the published videos.

`DARK_TOKENS` in `src/theme.ts` holds the app's dark theme tokens that the videos use, under their names in the `.dark` block of `../src/presentation/styles/globals.css`, and the app's `remotion-theme.test.ts` fails when a value differs. `THEME` derives every colour from them except the two hairlines, which have no token in the app. Each video's ground must match its surrounding surface. Font loading is limited to the Latin weights used here.

`locale-format` and `record-audit` read the website's supported locales from its i18n configuration. The admin rail in `app-tour` lists `ADMIN_NAVIGATION` from `../src/data/navigation.ts`, which joins the entries each area of the app declares in `../src/data/<area>.navigation.ts`, with the English labels of `../messages/en-US/pages.admin.sidebar.json`, so render `app-tour` again after the admin navigation changes. Those entries carry their `lucide-react` icons, and the app's `node_modules` is not installed when this project is checked, so `tsconfig.json` and `remotion.config.ts` resolve `lucide-react` from this project's own dependencies. Keep displayed paths and commands accurate. Test status illustrations omit changing suite counts; check actual results with `bun run test:coverage` at the repository root.

Use frame-based animation. `app-tour`, `page-designer` and `course-tour` start and finish on the same frame and use frame 0 as their poster. `course-tour` opens and closes on `public/author.jpg`, the author's portrait. Other compositions fade to their background at both ends through `Plate`. The app keeps the poster visible for reduced motion and unsupported video formats.

## Rendering

From this directory:

```sh
npx remotion render locale-format out/locale-format.webm --codec=vp9 --crf=36
npx remotion still locale-format out/locale-format.png --frame=200
cwebp -q 90 out/locale-format.png -o out/locale-format.webp
```

Install the [WebP command-line tools](https://developers.google.com/speed/webp/docs/precompiled) for `cwebp`. Inspect the temporary video and poster, then copy both into `../src/presentation/assets/motion/` with the same basename. Use CRF 38 for `app-tour` and `page-designer` and CRF 36 for the remaining videos. All compositions use 60 fps.

Create responsive WebP posters from the same PNG at quality 82: `app-tour` needs widths 640, 800 and 1280; `page-designer` needs width 800; the other compositions need width 600. Name them `{composition}-{width}.webp` beside the full-size poster. For example:

```sh
cwebp -q 82 -m 6 -sharp_yuv -resize 800 0 out/app-tour.png -o ../src/presentation/assets/motion/app-tour-800.webp
```

Keep the full-size poster for high-density displays. `ConceptLoop` supplies the candidates through native `srcset`; the browser chooses according to the rendered width and pixel density. A media-constrained preload gives the hero image high priority on desktop. Images load lazily elsewhere. The image remains visible for reduced motion or failed playback and is hidden once the video starts playing.

`course-tour` plays with the browser's controls when a visitor presses it, so it differs from the loops: render it without an audio track, add an H.264 MP4 for browsers without WebM, and give it AVIF posters next to the WebP ones, all at 1600 and 800 pixels wide. Render it from this directory, then create the AVIF posters with the application's `sharp` from the repository root:

```sh
npx remotion render course-tour out/course-tour.webm --codec=vp9 --crf=36 --muted
npx remotion render course-tour out/course-tour.mp4 --codec=h264 --crf=24 --muted
npx remotion still course-tour out/course-tour.png --frame=0
cwebp -q 90 out/course-tour.png -o ../src/presentation/assets/motion/course-tour.webp
cwebp -q 82 -m 6 -sharp_yuv -resize 800 0 out/course-tour.png -o ../src/presentation/assets/motion/course-tour-800.webp
cd ..
bun -e 'import sharp from "sharp"; const avif = { chromaSubsampling: "4:4:4", effort: 9, quality: 62 }; const png = "remotion/out/course-tour.png"; await sharp(png).avif(avif).toFile("src/presentation/assets/motion/course-tour.avif"); await sharp(png).resize({ width: 800 }).avif(avif).toFile("src/presentation/assets/motion/course-tour-800.avif")'
```

Copy `out/course-tour.webm` and `out/course-tour.mp4` into `../src/presentation/assets/motion/` too.

Regenerate the video, full-size poster and responsive posters after changing any visible content. Verify product loops at frame 0 and their final frame before replacing existing assets.
