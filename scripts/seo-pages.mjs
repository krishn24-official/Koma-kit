/**
 * Generates the static search landing pages in public/<slug>/index.html and public/sitemap.xml.
 * Edit the PAGES list below, then run: npm run seo:pages
 *
 * These pages are plain HTML (no JavaScript needed) so search engines can read them directly.
 * Each one explains one use of Koma Kit and links to the editor at "/".
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const SITE = 'https://koma-kit.vercel.app';
const PUBLIC_DIR = join(dirname(fileURLToPath(import.meta.url)), '..', 'public');
const TODAY = new Date().toISOString().slice(0, 10);

/** Answers shared by every page (all true for the app as built). */
const COMMON_FAQ = [
  [
    'Is Koma Kit really free?',
    'Yes. Every feature is free, with no trial, no premium plan and no watermark on your downloads.',
  ],
  [
    'Do I need to sign up or log in?',
    'No. There is no account. Open the site and start editing straight away.',
  ],
  [
    'Are my photos uploaded anywhere?',
    'No. Your photos and videos are edited inside your own browser and never leave your device. Saved templates are stored in your browser too.',
  ],
  [
    'Does it work on my phone?',
    'Yes. Koma Kit works in the browser on Android phones, iPhones, tablets and computers. Nothing to install.',
  ],
];

const PAGES = [
  {
    slug: 'free-photo-editor',
    title: 'Free Online Photo Editor – No Sign-Up, No Watermark | Koma Kit',
    description:
      'Free online photo editor that works in your browser. Add text, stickers, borders, glow and shadows, adjust colors, crop and download in HD. No login, no watermark, no uploads.',
    h1: 'Free online photo editor',
    lead: 'Edit photos right in your browser: crop, adjust colors, add text, stickers, borders, glow and shadows, then download in high quality. No account, no watermark, and your photos stay on your device.',
    features: [
      ['Crop and resize', 'Crop any photo and pick a size for Instagram, Stories, TikTok, YouTube thumbnails, X and Pinterest, or set your own.'],
      ['Picture colors', 'Change brightness, contrast and saturation of each photo.'],
      ['Text with great fonts', 'Bold titles in Bangers, Anton, Bebas Neue, Cinzel, Montserrat and more.'],
      ['Stickers and logos', 'Add pictures and logos on top, then cut out just the part you want.'],
      ['Borders, glow and shadow', 'Give photos and stickers borders, soft glows, drop shadows and faded edges.'],
      ['HD download', 'Save as PNG or JPG, or as an MP4 video when your design has video clips.'],
    ],
    steps: ['Open the editor and add your photos.', 'Crop, adjust colors and add text or stickers.', 'Tap Download to save your picture.'],
    faq: [
      ['Can I edit photos without downloading an app?', 'Yes. Koma Kit runs in any modern browser, so there is nothing to install.'],
    ],
  },
  {
    slug: 'photo-editor-no-sign-up',
    title: 'Photo Editor Without Login – Private, No Uploads | Koma Kit',
    description:
      'Edit photos online without login or sign-up. Koma Kit works fully in your browser, so your photos are never uploaded or shared. Free, no watermark.',
    h1: 'Photo editor without login or uploads',
    lead: 'Most online editors make you create an account and upload your photos to their servers. Koma Kit does neither: it edits everything inside your browser, so your pictures never leave your device.',
    features: [
      ['No account', 'No email, no password, no sign-up screen. Just open it and edit.'],
      ['No uploads', 'Photos and videos are processed on your own device, not on a server.'],
      ['No watermark', 'What you download is clean and yours to post anywhere.'],
      ['Saved in your browser', 'Save designs as templates. They stay in your browser on your device.'],
      ['Any device', 'Works in the browser on Android, iPhone, tablets and computers. Nothing to install.'],
      ['Full editor', 'Grids, collages, text, stickers, cut-outs, effects and HD downloads.'],
    ],
    steps: ['Open Koma Kit. No sign-up needed.', 'Add photos from your phone or computer.', 'Edit and download. Nothing is uploaded.'],
    faq: [
      ['Does Koma Kit collect my photos?', 'No. Your photos are never sent to a server. The site only counts anonymous page visits to see how many people use it.'],
    ],
  },
  {
    slug: 'anime-poster-maker',
    title: 'Anime Poster Maker – Free, No Sign-Up | Koma Kit',
    description:
      'Make anime posters, character edits and announcement graphics for free. Grid layouts, bold anime fonts, logos, glow and fades. Download in HD, no watermark.',
    h1: 'Free anime poster maker',
    lead: 'Create anime posters, character line-ups, season announcements and fan edits in minutes. Drop in your screenshots, add the show logo and a bold title, and download a sharp poster ready to post.',
    features: [
      ['Poster templates', 'Start from ready layouts like group posters, news banners, honeycomb and polaroid scatter.'],
      ['Panel grids', 'Split the poster into manga-style panels and drag the dividers to resize.'],
      ['Anime-style fonts', 'Bangers, Anton, Bebas Neue, Permanent Marker and other bold title fonts.'],
      ['Logos and cut-outs', 'Add the anime logo or a character and cut it out from the background.'],
      ['Glow, shadow and fades', 'Make characters pop with glows, drop shadows and faded edges.'],
      ['Sizes for every platform', 'Instagram, Stories, TikTok, X, YouTube thumbnail and Pinterest.'],
    ],
    steps: ['Pick a poster template or layout.', 'Add your anime screenshots, logo and title.', 'Download your poster as PNG or JPG.'],
    faq: [
      ['Can I make anime edits with video?', 'Yes. You can put video clips in the boxes and download the result as an MP4.'],
    ],
  },
  {
    slug: 'anime-templates',
    title: 'Free Anime Templates – Grids, Posters & Edits | Koma Kit',
    description:
      'Free anime templates for posts, posters and edits: panel grids, character line-ups, news banners and more. Customize online and download, no sign-up.',
    h1: 'Free anime templates',
    lead: 'Ready-made anime templates for Instagram, X, TikTok and YouTube: panel grids, character line-ups, news banners and collages. Fill them with your own pictures and make them yours.',
    features: [
      ['Grid templates', 'Manga-style panel grids from 2 to many boxes, fully adjustable.'],
      ['Character line-ups', 'Show off a cast or your top picks in one clean layout.'],
      ['News and announcement banners', 'Share season news, release dates and rankings.'],
      ['Save your own templates', 'Turn any design into your own template and reuse it.'],
      ['Card sheets', 'Put several cards or pictures on one sheet and download them together.'],
      ['Photo mosaic', 'Rebuild a character picture out of many small screenshots.'],
    ],
    steps: ['Open the Templates tab and pick one.', 'Tap each box to add your pictures.', 'Change the text, colors and size, then download.'],
    faq: [
      ['Can I use these templates for my fan page?', 'Yes. Make as many posts as you like and post them anywhere.'],
    ],
  },
  {
    slug: 'photo-collage-maker',
    title: 'Free Photo Collage Maker – Grid Layouts, No Sign-Up | Koma Kit',
    description:
      'Make photo collages online for free. Choose a grid layout, drag dividers, add text and stickers and download in HD. No watermark, no login, works on mobile.',
    h1: 'Free photo collage maker',
    lead: 'Put several photos into one picture with flexible grid layouts. Drag the dividers to resize boxes, add text and stickers, and download a high-quality collage for any social platform.',
    features: [
      ['Many grid layouts', 'From simple 2-photo splits to detailed multi-panel grids.'],
      ['Drag to resize', 'Move the lines between boxes to get the exact layout you want.'],
      ['Crop each photo', 'Zoom and position every photo inside its box.'],
      ['Gaps, corners and backgrounds', 'Set spacing, rounded corners and background colors.'],
      ['Video collages', 'Mix photos and video clips and export an MP4.'],
      ['Right size every time', 'Presets for Instagram, Stories, TikTok, X, YouTube and Pinterest.'],
    ],
    steps: ['Choose a grid layout.', 'Add a photo to each box and crop it.', 'Add text if you like and download.'],
    faq: [
      ['How many photos can a collage have?', 'Pick a layout with as many boxes as you need, from 2 photos up to large grids. You can also add more photos on top as stickers.'],
    ],
  },
  {
    slug: 'photo-mosaic-maker',
    title: 'Free Photo Mosaic Maker Online – No Sign-Up | Koma Kit',
    description:
      'Turn one picture into a mosaic made of many small photos. Free online photo mosaic maker with color matching. Runs in your browser, no uploads, no watermark.',
    h1: 'Free photo mosaic maker',
    lead: 'Rebuild a main picture out of dozens or hundreds of your own small photos. Koma Kit matches every tile to the colors of the main picture so the image stays recognisable up close and from far away.',
    features: [
      ['Smart color matching', 'Each tile is chosen to fit the colors of its spot in the main picture.'],
      ['Use your own tiles', 'Add as many small photos or screenshots as you like.'],
      ['Adjustable detail', 'Choose how many tiles go across for more or less detail.'],
      ['Avoid repeats', 'Optionally keep the same tile from sitting right next to itself.'],
      ['Private', 'All matching happens on your device. Nothing is uploaded.'],
      ['HD download', 'Save the finished mosaic as a large image.'],
    ],
    steps: ['Open Photo mosaic and pick the main picture.', 'Add the small tile photos.', 'Adjust the detail and download.'],
    faq: [
      ['What is a photo mosaic?', 'A big picture made of many small pictures. From far away you see the main image; up close you see every tile photo.'],
    ],
  },
];

const esc = (s) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const LOGO = `<svg viewBox="0 0 32 32" width="28" height="28" aria-hidden="true"><rect x="3" y="3" width="26" height="12" rx="3" fill="#f43f5e"/><rect x="3" y="17" width="12" height="12" rx="3" fill="#f5f5f5"/><rect x="17" y="17" width="12" height="12" rx="3" fill="#fb7185"/></svg>`;

function renderPage(page) {
  const url = `${SITE}/${page.slug}/`;
  const faq = [...page.faq, ...COMMON_FAQ];
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: 'Koma Kit',
      url: `${SITE}/`,
      applicationCategory: 'MultimediaApplication',
      applicationSubCategory: 'Photo editor',
      operatingSystem: 'Any (web browser)',
      browserRequirements: 'Requires a modern web browser',
      isAccessibleForFree: true,
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      description: page.description,
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: faq.map(([q, a]) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    },
    {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Koma Kit', item: `${SITE}/` },
        { '@type': 'ListItem', position: 2, name: page.h1, item: url },
      ],
    },
  ];
  const related = PAGES.filter((p) => p.slug !== page.slug);

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${esc(page.title)}</title>
<meta name="description" content="${esc(page.description)}" />
<link rel="canonical" href="${url}" />
<meta name="theme-color" content="#0a0a0a" />
<link rel="icon" type="image/svg+xml" href="/favicon.svg" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Koma Kit" />
<meta property="og:title" content="${esc(page.title)}" />
<meta property="og:description" content="${esc(page.description)}" />
<meta property="og:url" content="${url}" />
<meta property="og:image" content="${SITE}/og-image.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:title" content="${esc(page.title)}" />
<meta name="twitter:description" content="${esc(page.description)}" />
<meta name="twitter:image" content="${SITE}/og-image.png" />
<link rel="stylesheet" href="/seo.css" />
<script type="application/ld+json">${JSON.stringify(jsonLd)}</script>
</head>
<body>
<header class="top">
  <a class="brand" href="/">${LOGO}<span>Koma Kit</span></a>
  <a class="btn small" href="/">Open editor</a>
</header>
<main>
  <section class="hero">
    <h1>${esc(page.h1)}</h1>
    <p class="lead">${esc(page.lead)}</p>
    <a class="btn" href="/">Start editing free</a>
    <ul class="badges"><li>100% free</li><li>No sign-up</li><li>No watermark</li><li>Photos stay on your device</li></ul>
  </section>
  <section>
    <h2>What you can do</h2>
    <div class="grid">
${page.features.map(([t, d]) => `      <div class="card"><h3>${esc(t)}</h3><p>${esc(d)}</p></div>`).join('\n')}
    </div>
  </section>
  <section>
    <h2>How it works</h2>
    <ol class="steps">
${page.steps.map((s) => `      <li>${esc(s)}</li>`).join('\n')}
    </ol>
    <a class="btn" href="/">Open Koma Kit</a>
  </section>
  <section>
    <h2>Questions</h2>
${faq.map(([q, a]) => `    <details><summary>${esc(q)}</summary><p>${esc(a)}</p></details>`).join('\n')}
  </section>
  <section>
    <h2>More free tools</h2>
    <ul class="links">
${related.map((p) => `      <li><a href="/${p.slug}/">${esc(p.h1)}</a></li>`).join('\n')}
    </ul>
  </section>
</main>
<footer>Koma Kit · Free photo editor, collage maker and anime poster maker that runs in your browser.</footer>
</body>
</html>
`;
}

for (const page of PAGES) {
  const file = join(PUBLIC_DIR, page.slug, 'index.html');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, renderPage(page));
}

const urls = [`${SITE}/`, ...PAGES.map((p) => `${SITE}/${p.slug}/`)];
writeFileSync(
  join(PUBLIC_DIR, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls.map((u) => `  <url><loc>${u}</loc><lastmod>${TODAY}</lastmod></url>`).join('\n')}
</urlset>
`,
);

console.log(`Wrote ${PAGES.length} pages and sitemap.xml`);
