// Downloads royalty-free wedding photos from Pixabay for the public demo
// event, so the demo never shows client photos.
//
//   node --env-file=.env.local scripts/fetch-demo-photos.mjs            # download
//   node --env-file=.env.local scripts/fetch-demo-photos.mjs --dry-run  # counts only
//   node --env-file=.env.local scripts/fetch-demo-photos.mjs --out ~/Desktop/demo-photos
//
// Each moment of a wedding is one Pixabay search. Files are numbered in the
// order a real shoot would have them (getting ready → ceremony → portraits →
// reception) as DEMO_0001.jpg, …, so the event looks like one camera roll.
//
// Also writes, next to the photos:
//   photos.csv  name, moment, Pixabay id, author, page: which moment each
//               photo was searched for, to help label eval queries (check by
//               eye; a search for "rings" can return photos without rings)
//   CREDITS.md  author and link for every photo
//
// Pixabay's terms ask to download images rather than hotlink them, and to
// credit Pixabay. Their search can include AI-generated images; those tagged
// as such are skipped, but look through the folder before uploading.

import { mkdir, writeFile, readdir } from "node:fs/promises";
import { join, resolve } from "node:path";

const args = process.argv.slice(2);
const flag = (name) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 ? args[i + 1] : undefined;
};
const DRY_RUN = args.includes("--dry-run");
const OUT_DIR = resolve(flag("out") ?? "demo-photos");
const KEY = process.env.PIXABAY_API_KEY;
if (!KEY) {
  console.error("Missing PIXABAY_API_KEY in .env.local");
  process.exit(1);
}

// In shoot order. `count` is how many to keep; aim for 3–15 per moment so
// each can be an eval query with several right answers. Pixabay's search is
// loose ("groom friends" also returns couples on a beach), so `tag` is a
// pattern a photo's own tags must match to count for that moment.
const MOMENTS = [
  {
    moment: "bride getting ready",
    q: "bride getting ready",
    tag: /bride|bridal/,
    count: 12,
  },
  { moment: "bride makeup", q: "bride makeup", tag: /make-?up/, count: 8 },
  { moment: "wedding dress", q: "wedding dress", tag: /dress|gown/, count: 8 },
  { moment: "bridesmaids", q: "bridesmaids", tag: /bridesmaid/, count: 8 },
  { moment: "groom", q: "groom suit", tag: /groom/, count: 12 },
  {
    moment: "groomsmen",
    q: "best man wedding",
    tag: /groomsm|best man/,
    count: 6,
  },
  { moment: "church", q: "wedding church", tag: /church|chapel/, count: 8 },
  {
    moment: "bride with father",
    q: "bride father",
    tag: /father|dad/,
    count: 8,
  },
  {
    moment: "ceremony",
    q: "wedding ceremony",
    tag: /ceremony|altar|aisle/,
    count: 15,
  },
  {
    moment: "officiant",
    q: "wedding priest",
    tag: /priest|officiant|pastor|minister/,
    count: 6,
  },
  { moment: "rings", q: "wedding rings", tag: /ring/, count: 10 },
  { moment: "kiss", q: "wedding kiss", tag: /kiss/, count: 10 },
  {
    moment: "couple portrait",
    q: "bride and groom",
    tag: /bride|groom|newlywed/,
    count: 20,
  },
  {
    moment: "family",
    q: "wedding family",
    tag: /family|parents|mother|grand/,
    count: 10,
  },
  { moment: "kids", q: "flower girl", tag: /girl|child|kid|boy/, count: 8 },
  {
    moment: "guests",
    q: "wedding guests",
    tag: /guest|party|people|crowd/,
    count: 10,
  },
  { moment: "bouquet", q: "wedding bouquet", tag: /bouquet/, count: 8 },
  {
    moment: "decoration",
    q: "wedding table decoration",
    tag: /table|decor/,
    count: 8,
  },
  { moment: "cake", q: "wedding cake", tag: /cake/, count: 8 },
  { moment: "first dance", q: "wedding dance", tag: /danc/, count: 10 },
  { moment: "dog", q: "wedding dog", tag: /dog|puppy/, count: 4 },
];

const PER_PAGE = 200; // Pixabay's maximum
const MIN_WIDTH = 1200;
const DOWNLOAD_CONCURRENCY = 4;
// Tags that mark AI-generated or non-photo content
const SKIP_TAGS =
  /\b(ai generated|ai-generated|generated|illustration|drawing|render|3d|clipart|vector)\b/i;

async function search(q) {
  const url = new URL("https://pixabay.com/api/");
  url.search = new URLSearchParams({
    key: KEY,
    q,
    image_type: "photo",
    safesearch: "true",
    min_width: String(MIN_WIDTH),
    order: "popular",
    per_page: String(PER_PAGE),
  });
  const res = await fetch(url, { signal: AbortSignal.timeout(30_000) });
  if (!res.ok) {
    throw new Error(
      `Pixabay search "${q}" failed (${res.status}): ${await res.text()}`,
    );
  }
  return (await res.json()).hits ?? [];
}

async function download(url, path) {
  const res = await fetch(url, { signal: AbortSignal.timeout(60_000) });
  if (!res.ok) throw new Error(`download failed (${res.status})`);
  await writeFile(path, Buffer.from(await res.arrayBuffer()));
}

async function mapLimit(items, limit, fn) {
  let next = 0;
  await Promise.all(
    Array.from({ length: Math.min(limit, items.length) }, async () => {
      while (next < items.length) await fn(items[next++]);
    }),
  );
}

// ---------------------------------------------------------------------------

if (!DRY_RUN) {
  await mkdir(OUT_DIR, { recursive: true });
  const existing = (await readdir(OUT_DIR)).filter((f) => /\.jpe?g$/i.test(f));
  if (existing.length) {
    console.error(
      `${OUT_DIR} already has ${existing.length} photos. Use an empty folder (--out).`,
    );
    process.exit(1);
  }
}

const seen = new Set(); // Pixabay ids already taken by an earlier moment
const picked = [];
for (const { moment, q, tag, count } of MOMENTS) {
  const hits = (await search(q)).filter(
    (h) =>
      !seen.has(h.id) &&
      !SKIP_TAGS.test(h.tags ?? "") &&
      tag.test((h.tags ?? "").toLowerCase()),
  );
  const take = hits.slice(0, count);
  take.forEach((h) => seen.add(h.id));
  picked.push(...take.map((h) => ({ moment, hit: h })));
  console.log(
    `${moment.padEnd(20)} ${String(take.length).padStart(2)}/${count}` +
      (take.length < count ? `  (only ${hits.length} usable results)` : ""),
  );
}

const rows = picked.map(({ moment, hit }, i) => ({
  name: `DEMO_${String(i + 1).padStart(4, "0")}`,
  moment,
  id: hit.id,
  author: hit.user,
  page: hit.pageURL,
  url: hit.largeImageURL, // ~1280px: more than the app's 600px thumbs and 768px AI input
}));
console.log(
  `\n${rows.length} photos${DRY_RUN ? " (dry run, nothing downloaded)" : ""}`,
);
if (DRY_RUN) process.exit(0);

let done = 0;
const failed = [];
await mapLimit(rows, DOWNLOAD_CONCURRENCY, async (row) => {
  try {
    await download(row.url, join(OUT_DIR, `${row.name}.jpg`));
  } catch (err) {
    failed.push(`${row.name}: ${err.message}`);
  }
  done++;
  if (done % 20 === 0 || done === rows.length) {
    process.stdout.write(`\rDownloaded ${done}/${rows.length}`);
  }
});
console.log();

const ok = rows.filter((r) => !failed.some((f) => f.startsWith(r.name)));
const csv = (v) => `"${String(v).replace(/"/g, '""')}"`;
await writeFile(
  join(OUT_DIR, "photos.csv"),
  [
    "name,moment,pixabay_id,author,page",
    ...ok.map((r) =>
      [r.name, r.moment, r.id, r.author, r.page].map(csv).join(","),
    ),
  ].join("\n") + "\n",
);

const byAuthor = new Map();
for (const r of ok)
  byAuthor.set(r.author, [...(byAuthor.get(r.author) ?? []), r]);
await writeFile(
  join(OUT_DIR, "CREDITS.md"),
  [
    "# Demo photo credits",
    "",
    `The demo event's ${ok.length} photos are from [Pixabay](https://pixabay.com), used under the [Pixabay Content License](https://pixabay.com/service/license-summary/). Thanks to the photographers:`,
    "",
    ...[...byAuthor]
      .sort((a, b) => b[1].length - a[1].length)
      .map(
        ([author, photos]) =>
          `- **${author}**: ${photos.map((p) => `[${p.name}](${p.page})`).join(", ")}`,
      ),
    "",
  ].join("\n"),
);

if (failed.length)
  console.log(`Failed (${failed.length}):\n  ${failed.join("\n  ")}`);
console.log(
  `Saved ${ok.length} photos, photos.csv and CREDITS.md to ${OUT_DIR}`,
);
