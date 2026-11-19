# Koma Kit — Template Maker for Anime Posts

A free, frontend-only web app for making anime and pop-culture post templates (grids, comparisons, news banners and video edits) and downloading them for X or other social networks.

*Koma* (コマ) is Japanese for a manga panel.

Everything runs in your browser. Images and videos are never uploaded to a server.

## Features

### Layout
- **Starter templates:** one tap sets up a full design. Includes a *News banner* (1600×500 card with character art, anime/event logo slots, a NEW INFO badge, date, subtitle and watermark).
- **16 layout presets:** single, columns, rows, 2×2 up to 4×4, and mixed layouts such as 1-top-2-bottom or a big box with 3 small ones.
- **Layers:** *Add layer* grows the layout in the natural direction (a new row under rows, a new column beside columns or grids). There are also *Add row*, *Add column*, *Remove box* and *Equal sizes*.
- **Resizable boxes:** drag the handles between boxes. Each divider moves on its own, so one box can be large and the others small.

### Pictures and videos in boxes
- Upload per box (tap or drag & drop) or many at once. Swap, replace or remove.
- Pan (drag) and zoom (wheel, pinch, slider or +/−), plus *Fit whole picture* and *Fill box*.
- **Box fade:** a color gradient over a box from the left, right, both sides, bottom or evenly, so text stays readable.

### Canvas
- **Sizes:** ratios (4:5, 1:1, 3:4, 2:3, 16:9, 9:16), platform presets (X post, X header, Instagram post and square, Story/Reels/TikTok, YouTube thumbnail, Pinterest pin) and custom width × height.
- **Drag to resize** with grips on the canvas edges. It snaps to common ratios.
- **Crop** the canvas to any area. Edges snap to picture edges, and everything inside stays in place.
- **Fit to pictures** picks the canvas height so every picture fills its box.
- **Backgrounds:** solid color, gradient (presets or custom, any angle) or a picture with blur and darken.
- Gap, outer border and corner radius.

### Elements (on top of the canvas)
- **Text:** anime-style fonts (Bangers, Anton, Montserrat, Cinzel and more), left/center/right alignment, letter spacing, optional outline and shadow.
- **Logos and pictures:** upload any PNG/JPG (transparent PNGs work best). Templates include empty slots you tap to fill. **Crop** a logo to cut off unwanted edges.
- **Badges:** pill or box labels such as "NEW INFO", outlined or filled.
- Every element can be dragged, resized with its corner dot, rotated, faded, reordered, duplicated and deleted.

### Video
- Videos can go in any box, next to images or other videos.
- **Timeline:** play, pause, scrub and step frame by frame. *Show new at…* schedules a picture or video to appear in a box at an exact moment (e.g. manga panels synced to an anime clip).
- **Trim** a video's start or end at the playhead.
- The original sound of a chosen video is used in the preview and the export.

### Download
- **Download** opens a dialog: PNG or JPG at 1×, 1.5×, 2× or the exact platform size, or **MP4** (H.264, 30 fps, 720p or 1080p) when there is a video. You can also set the file name, copy to the clipboard or share (on phones).
- MP4s are encoded on the device with WebCodecs, frame by frame, so pictures change exactly on time.

### General
- Works on phones (bottom tabs) and on tablets and desktops (sidebar). Touch, pinch, mouse and trackpad all work.
- Keyboard: `Space` plays or pauses, `Delete` removes the selection, `Esc` clears the selection or cancels a crop.

## Roadmap

- Mixing sound from several videos
- Remove background from logos
- Save your own designs as reusable templates
- Several cards in one image (e.g. a grid of news banners)

## Getting started

Requires Node.js 20 or newer.

```bash
npm install
npm run dev       # start the dev server (http://localhost:5173)
npm run build     # type-check + production build into dist/
npm run preview   # preview the production build
npm run lint
```

To try it on a phone on the same Wi-Fi, run `npm run dev -- --host` and open the "Network" address it prints.

## Deploying

`dist/` is a static site. On Vercel, import the repo: Vercel detects Vite, uses `npm run build` as the build command and serves `dist`. No configuration file is needed.

## Branches

- `dev`: active development. All changes are committed here first.
- `main`: release branch. `dev` is merged into `main` through a pull request when a version is ready.

## Tech

React 18 · TypeScript (strict) · Vite · Tailwind CSS v4 · Zustand · @use-gesture/react · lucide-react · Mediabunny (MP4 encoding, loaded only when exporting video)

## Project structure

```
src/
├── App.tsx                   # app shell
├── main.tsx
├── types/                    # shared TypeScript types
├── constants/                # layouts, canvas sizes, fonts, elements, templates, defaults
├── store/
│   ├── useEditorStore.ts     # the design: layout, media, elements, style + actions (Zustand)
│   ├── usePlaybackStore.ts   # timeline clock (play/pause/seek)
│   ├── useUiStore.ts         # UI state: active panel, crop, dialogs, toasts
│   └── selectors.ts          # derived-state hooks and the export snapshot
├── hooks/                    # gestures, uploads, crop, fit, export, playback, shortcuts
├── utils/
│   ├── layoutTree.ts         # layout tree: add/remove boxes, dividers, resolve to rects
│   ├── layoutMath.ts         # fractional rects → pixel rects with gaps
│   ├── imageTransform.ts     # cover/contain, zoom bounds, pan clamping
│   ├── renderToCanvas.ts     # draws a frame (shared by image and video export)
│   ├── drawElements.ts       # draws text, logos and badges
│   ├── background.ts         # backgrounds and box fades
│   ├── cropCanvas.ts         # canvas crop that keeps content in place
│   ├── timeline.ts           # which item shows when, trim math
│   ├── videoExport.ts        # MP4 encoder (lazy-loaded)
│   └── …
├── components/
│   ├── ui/                   # reusable primitives (Button, Slider, ColorPicker, …)
│   ├── editor/               # canvas, boxes, elements, crop frames, toolbar
│   ├── timeline/             # playback bar and tracks
│   ├── panels/               # Layout / Canvas / Style / Elements panels + registry
│   ├── download/             # download dialog and options
│   └── layout/               # Header, Sidebar, MobilePanel
└── styles/index.css
```

## How it works

- **Layouts are trees.** Each split divides its area between its children by `sizes`, and each leaf is one box (`utils/layoutTree.ts`). Every divider resizes on its own, which is what lets one box grow without moving unrelated boxes. Presets are defined in `src/constants/layouts.ts`.
- **Design units.** Every canvas is 1080 units wide. Gaps, font sizes, logo widths and blur are stored in these units. The preview multiplies them by the on-screen scale, and the export by the export scale, so the preview and the download match.
- **Image transforms** are stored relative to the box (`scale` relative to "cover", offsets as a fraction of the box size). They keep working after the layout, canvas size or gap changes.
- **Export** draws everything onto an HTML canvas with the same math as the preview (`utils/renderToCanvas.ts`). It does not screenshot the page, so the output is sharp and correctly placed.
- **Timeline.** Each box holds a list of items sorted by start time and shows the latest one that has started (`utils/timeline.ts`). In the preview, the video providing the sound is the playback clock, so pictures stay in sync with the audio.
- **Video export** (`utils/videoExport.ts`) decodes exactly the frame each video needs for every output frame, draws it with the same `drawTemplate` function, encodes H.264 with WebCodecs and adds the original audio. The result is frame-accurate, unlike a screen recording.
