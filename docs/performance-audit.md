# Performance audit: open issues

Found in the October 2026 audit and not fixed yet. Critical security and data-loss issues aren't listed here.

Already fixed: proxy auth calls (`getClaims()`, plus skipping visitors with no session cookie), storage usage from SQL instead of a bucket scan, and photo counts from a single `GROUP BY` query.

## Unnecessary API requests and server work

### 1. Event detail and edit pages fetch every event to find one
[app/events/[slug]/page.tsx:53](../app/events/[slug]/page.tsx#L53) and [app/events/[slug]/edit/page.tsx:12](../app/events/[slug]/edit/page.tsx#L12) call `getStoredProducts()` and then `.find()` in JS. The detail page also waits for selections before it fetches the selected photos ([line 68](../app/events/[slug]/page.tsx#L68)).

**Fix:** add a `getEventForOwner(slug)` that uses `.eq("slug", slug).single()`.

### 2. The public selection page queries the same event several times
On every `/select/[slug]` visit, `getEventBySlug` ([store.ts:94](../app/events/store.ts#L94)) runs in `generateMetadata`, in the page, and in `opengraph-image`. `isEventOwner` ([store.ts:110](../app/events/store.ts#L110)) then queries `events` again just to read `created_by`.

**Fix:** wrap `getEventBySlug` in `React.cache()`. Have it return `created_by` internally so `isEventOwner` can compare without a second query, without sending `created_by` to the client.

### 3. Each autosave makes 3 database round trips in sequence; finalize repeats work
`persistSelections` ([store.ts:304](../app/events/store.ts#L304)) selects the event and then upserts the selection. `saveSelections` then updates `events` too. `handleFinalize` calls `flush()` (a full save) before `finalizeSelections`, which saves everything again. The client also waits for the Resend email to send ([store.ts:406](../app/events/store.ts#L406)).

**Fix:**
- Run the event select and the upsert with `Promise.all`, or move the whole thing into one Postgres function.
- In finalize, wait for any save already in progress instead of starting a new one.
- Send the email with `after()` from `next/server`.

### 4. Deleting an event sends one R2 request per file
[lib/r2.ts:76](../lib/r2.ts#L76) sends a `DeleteObject` for every key, up to 1,000 at once.

**Fix:** `DeleteObjectsCommand` deletes up to 1,000 keys per request.

### 5. `next/image` re-processes thumbnails that are already optimized
[SelectedPhotosSection.tsx:132](../app/events/[slug]/SelectedPhotosSection.tsx#L132) passes 600px WebP thumbnails through Vercel Image Optimization, which uses up the quota for no gain.

**Fix:** add `unoptimized`, or use a plain `<img>`.

## Client speed and bandwidth

### 6. The preview loads the full-resolution original
[ImagePreview.tsx:162](../components/ImagePreview.tsx#L162) loads `originalUrl`, often 10–25 MB on mobile. HEIC and TIFF originals don't display at all in Chrome or Firefox.

**Fix:** generate a ~2048px WebP preview at upload, show that in the modal, and preload the previous and next photos.

### 7. No caching on R2 files, served from `r2.dev`
`PutObjectCommand` sets no `CacheControl`. Cloudflare rate-limits `r2.dev`, doesn't CDN-cache it, and says it's for development only.

**Fix:**
- Set `CacheControl: "public, max-age=31536000, immutable"` on upload. File names are UUIDs, so files never change.
- Serve the bucket from a custom domain.
- Update `R2_PUBLIC_URL` and `images.remotePatterns`.

### 8. Thumbnails from phone photos can come out sideways
[app/api/upload/route.ts:87](../app/api/upload/route.ts#L87): Sharp drops EXIF metadata when writing WebP, without applying the rotation first.

**Fix:** call `.rotate()` before `.resize()`, or pass `{ autoOrient: true }`.

### 9. The gallery slows down as the client scrolls
Every heart tap re-renders every `PhotoCard` on screen: the cards aren't memoized and the click handlers are recreated on each render. Cards never unmount, so after scrolling through 1,000 photos each tap re-renders 1,000 cards. Thumbnails ([PhotoCard.tsx:49](../components/PhotoCard.tsx#L49)) have no `loading`/`decoding` hints.

**Fix:**
- Wrap `PhotoCard` in `memo` and give it stable `onToggle(id)` / `onPreview(photo)` callbacks, or turn on the React Compiler.
- Add `content-visibility: auto` with `contain-intrinsic-size` to the cards.
- Add `loading="lazy" decoding="async"` to the thumbnails.

### 10. Photos upload one at a time
[app/events/new/page.tsx:86](../app/events/new/page.tsx#L86) uploads files in sequence.

**Fix:** upload 3–4 at once.

### 11. Closing the tab can lose the last 1.5 s of selections
The `visibilitychange`/`pagehide` flush ([SelectionPage.tsx:135](../app/select/[slug]/SelectionPage.tsx#L135)) calls a server action, and the browser can cancel that request as the page unloads.

**Fix:** send the final save with `navigator.sendBeacon` to a route handler, or show a `beforeunload` warning while there are unsaved changes.

### 12. "Worked on" saves can arrive out of order
`saveWorkedOn` ([store.ts:416](../app/events/store.ts#L416)) runs on every click with the full array, and nothing orders the calls, so an older state can overwrite a newer one.

**Fix:** reuse the debounce-and-queue approach from `SelectionPage`'s autosave.

## Other

- **`"use server"` in [lib/r2.ts](../lib/r2.ts#L1).** It makes every export a potential public endpoint. Today it's safe only because no client component imports these functions. Replace it with `import "server-only"`.
- **No `loading.tsx` or `error.tsx`.** Admin navigation shows no feedback while waiting. `getPhotosBySlug` / `getPhotosByIds` ([r2.ts:111](../lib/r2.ts#L111), [r2.ts:142](../lib/r2.ts#L142)) return `[]` on error, so a failure looks like "Sin fotos" instead of an error.
- **Database indexes and RLS aren't tracked in the repo.** Confirm `photos(event_slug, display_order, id)`, unique `selections(event_slug)` and unique `events(slug)` exist. Also confirm RLS on `events` and `photos` limits rows to `created_by = auth.uid()`, since the upload route's ownership check depends on it.
- **Full page reloads after saving.** [new/page.tsx:148](../app/events/new/page.tsx#L148) and [EditForm.tsx:107](../app/events/[slug]/edit/EditForm.tsx#L107) set `window.location.href`. Use `router.push()` plus `router.refresh()`.
- **The OG image is regenerated on every bot fetch.** Cache it (for example with `revalidate`).
- **Leftover config.** `picsum.photos` / `images.unsplash.com` in `remotePatterns` ([next.config.ts:8](../next.config.ts#L8)). The `force-dynamic` comment in [route.ts:11](../app/api/upload/route.ts#L11) says it raises the body size limit; it doesn't.
- **Playfair Display loads on every page** ([app/layout.tsx:10](../app/layout.tsx#L10)) but only the selection page uses it. Move it to a `/select` layout.
