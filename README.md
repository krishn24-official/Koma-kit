# Koma Kit — Grid Template Maker

A frontend-only web app for making anime and pop-culture grid templates (3×3 posters, 2×2 "Victory Pose", 1-top-2-bottom comparisons, and more) and downloading them for X or other social networks.

*Koma* (コマ) is Japanese for a manga panel.

Images stay in your browser. Nothing is uploaded to a server.

## Features

- 16 layout presets (single, columns, rows, 2×2, 3×3, 4×4, mixed layouts like 1-top-2-bottom)
- Canvas sizes: 4:5, 1:1, 3:4, 2:3, 16:9, 9:16
- Upload per cell (click or drag & drop), bulk upload, swap cells, replace or remove images
- Pan (drag) and zoom (mouse wheel, trackpad or touch pinch, slider) inside each cell, plus Fit / Fill
- Gap, outer border, corner radius and background color
- Text layers with anime-style fonts, outline and shadow; drag to position
- Export as PNG or JPG at 1×, 1.5× or 2× resolution. Download, copy to clipboard, or share (mobile)
- Responsive: sidebar on tablet and desktop, bottom tabs on phones
- Keyboard: `Delete` removes the selection, `Esc` clears it

## Roadmap

- Video in cells, a timeline to show images at set times, and MP4 export with the clip's original audio
- Mixing audio from several clips
- Layers

## Branches

- `main`: this README only, for now
- `dev`: all application code (active development)

## Getting started

```bash
git checkout dev
npm install
npm run dev       # start dev server
npm run build     # type-check + production build into dist/
npm run preview   # preview the production build
npm run lint
```

`dist/` is static, so it deploys to Vercel with no extra config. Vercel detects Vite, uses `npm run build` as the build command, and serves the `dist` folder.

## Tech

React 18 · TypeScript (strict) · Vite · Tailwind CSS v4 · Zustand · @use-gesture/react · lucide-react

## Project structure

```
src/
├── App.tsx                 # app shell
├── main.tsx
├── types/                  # shared TypeScript types
├── constants/              # layouts, aspect ratios, fonts, editor defaults
├── store/
│   ├── useEditorStore.ts   # template state + actions (Zustand)
│   ├── useUiStore.ts       # UI state: active panel, toasts
│   └── selectors.ts        # derived-state hooks
├── hooks/                  # gestures, uploads, export, resize, shortcuts
├── utils/
│   ├── layoutMath.ts       # fractional layout → pixel rects
│   ├── imageTransform.ts   # cover/contain, zoom bounds, pan clamping
│   ├── textStyle.ts        # text metrics shared by preview + export
│   ├── renderToCanvas.ts   # full-resolution export renderer
│   └── …
├── components/
│   ├── ui/                 # reusable primitives (Button, Slider, ColorPicker, …)
│   ├── editor/             # canvas, cells, image view, text layers, toolbar
│   ├── panels/             # Layout / Style / Text / Export panels + registry
│   └── layout/             # Header, Sidebar, MobilePanel
└── styles/index.css
```

## How it works

- **Layouts** are lists of fractional rectangles (`{ x, y, w, h }` in 0–1). To add a layout, add an entry to `src/constants/layouts.ts`.
- **Design units.** Every canvas is 1080 units wide. Gap, radius and font sizes are stored in these units. The preview multiplies them by the on-screen scale, and the export multiplies them by the export scale. This keeps the preview and the downloaded image the same.
- **Image transforms** are stored relative to the cell (`scale` relative to "cover", offsets as a fraction of the cell size). They still work after the layout, canvas size or gap changes.
- **Export** draws everything onto an HTML canvas with the same math as the preview (`utils/renderToCanvas.ts`). It does not take a screenshot of the DOM, so the output is sharp and in the right place.
