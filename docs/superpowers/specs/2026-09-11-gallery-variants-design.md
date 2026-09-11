# Gallery Multi-Variant Artwork — Design Spec

**Date:** 2026-09-11
**Status:** Approved (brainstorming complete)
**Scope:** Single spec — add multi-variant support to the gallery with same-metadata variants.

## 1. Summary

Today one `artworks` row = one image (`image_url` / `thumbnail_url`). The gallery needs to support multiple image variants for a single artwork (e.g. SFW vs NSFW, day vs night) while keeping one set of shared metadata (title, artist, tags, date, NSFW flag, type) and one gallery card per artwork. Variants are exposed in the lightbox via a thumbnail strip. Batch upload is supported at creation, and variants can be added/removed/reordered on existing artworks.

## 2. Data Model & Migration

### 2.1 Column

- New column on `artworks`: `extra_images jsonb default '[]'::jsonb`.
- Each element: `{ url: string, thumbnail_url: string, width: number|null, height: number|null }`.
- The existing top-level `image_url` / `thumbnail_url` / `image_width` / `image_height` remain the **cover** (variant 1). `extra_images` holds variants 2..N.
- Display helpers: `variantCount = 1 + (extra_images?.length || 0)`, `variantImages = [cover, ...extra_images]` (derived client-side).

### 2.2 Migration SQL

```sql
alter table artworks add column if not exists extra_images jsonb default '[]'::jsonb;
```

Run once in Supabase SQL Editor. Update the schema comment in `gallery/js/supabase.js:10` to document the new column.

### 2.3 Backward compatibility

- Rows created before the migration have `extra_images = null` or `[]` — treated as single-image.
- All existing queries (`select *`, ordering, filtering) work unchanged; only admin writes and lightbox reads the new column.
- No backfill needed. No RLS changes.

### 2.4 Why this shape (vs alternatives)

- Alternatives considered: normalized `artwork_images` child table; grouped artworks via `group_id`. Chosen approach is the smallest schema change for "same metadata, different image files", cheapest to query and to upload (one insert), and migrates cleanly to a child table later if per-variant metadata is ever needed.

## 3. Admin Upload & Variant Management

### 3.1 New artwork — batch upload

File: `gallery/js/admin.js`

- File input: add `multiple` attribute; `fileDrop` drop handler accepts all `e.dataTransfer.files` (not just `[0]`).
- Each selected file is validated (image type) and compressed via existing `compressImage` in a loop. Failures surface per-file via `showToast`; valid files still proceed.
- Preview: horizontal strip of thumbnails below the drop zone. Each thumb has a remove (×) button. First thumb labeled "Cover". Reordering via drag (HTML5 drag-and-drop) or simple up/down controls — reordering determines which file becomes the cover (`image_url`) vs `extra_images` ordering.
- Validation: cap total variants (constant `MAX_VARIANTS = 8`) — drop zone rejects beyond cap with a toast. Per-file 10 MB limit already enforced by `compressImage`.
- On submit (`handleSubmit`): upload files sequentially or via `Promise.all` with segmented progress (`Uploading 2/4...`, `progressFill` per file). Collect `{url, thumbnail_url, width, height}` per Cloudinary result. First result → top-level `image_url`/`thumbnail_url`/`image_width`/`image_height`; remainder → `extra_images`. Single `insertArtwork` call with the new field.

### 3.2 Add variants to existing artwork

- New UI: "Manage variants" entry point. Visible only while authed (`AdminPanel.isAuthed`). Two options (pick one during implementation — prefer the simpler):
  1. Small edit/variant icon on each gallery card when authed, or
  2. A "Manage variants" button in the lightbox details when authed.
  Clicking opens a variant manager view (can reuse the admin modal with a variant-specific screen, or a small dedicated modal).
- Manager shows current thumbnails (cover + extras) with remove and reorder controls, plus a drop zone to add more files. Same compression and cap rules.
- On save: upload only new files to Cloudinary, then single `update` on the row merging new entries into `extra_images` (and updating top-level columns if cover was swapped or reordered). If cover is removed, next image promotes to cover.
- New helper in `gallery/js/supabase.js`: `updateArtwork(id, patch)` → `client.from('artworks').update(patch).eq('id', id).select().single()`.

### 3.3 Single-file still works

Selecting/dropping one file behaves exactly like today: one Cloudinary upload, `extra_images = []`, one card.

## 4. Gallery Grid

File: `gallery/js/gallery.js`

- `createCard`: derive `variantCount = 1 + (art.extra_images?.length || 0)`. When `variantCount > 1`, render a badge on the card (near the type badge, e.g. `<span class="variant-badge"><i class="fas fa-images"></i> ×N</span>`) with `aria-label="${N} variants"`.
- One card per artwork — no duplicate entries, no changes to `FilterEngine` (`gallery/js/filters.js`), sorting, search, or likes. NSFW handling and price/dimensions stay at the parent level.
- Card click still opens lightbox at that artwork's index in `filteredItems`.

## 5. Lightbox Variant Strip

File: `gallery/js/lightbox.js`

- On `show(index)`, build `this.variantImages = [{url: art.image_url, thumbnail_url: art.thumbnail_url, width: art.image_width, height: art.image_height}, ...(art.extra_images || [])]` and `this.currentVariant = 0`.
- Main image (`#lb-image`) shows `variantImages[currentVariant].url`. Thumbnail strip (new element, e.g. `#lb-variant-strip`) below the image shows all variants as small clickable thumbs (using `thumbnail_url`, lazy-loaded). Active thumb has a ring/highlight. Clicking a thumb switches `currentVariant`, updates main image src, resets zoom/pan, and updates full-quality link to the active variant's `url`.
- Full-quality button (`#lb-full-quality`) href tracks the active variant.
- Zoom/pan/dimensions operate on the active variant; dimensions text updates per variant when available.
- Artwork-level prev/next (`#lb-prev`/`#lb-next`, arrow keys) still navigate between artworks in `filteredItems`. Variant switching is via the strip (and optionally left/right when the strip has focus — do not overload global arrow keys).
- When `variantCount === 1`, the strip is hidden entirely.

Markup addition in `gallery/index.html`: new container for the variant strip inside `.lightbox-content` (between image wrap and details, or below details — final placement decided during styling).

## 6. Data Flow

**Create (N files):** select N → compress N → upload N to Cloudinary → collect N results → single `insert` with `extra_images = results[1..N]`.

**Add to existing (M new files):** select M → compress M → upload M → single `update` merging into `extra_images`.

**Read:** `fetchArtworks` returns rows including `extra_images`; gallery and lightbox derive `variantImages` client-side.

## 7. Error Handling & Edge Cases

- **Cloudinary partial failure (create):** if any upload fails, surface which file failed with retry; do not insert a half-built row.
- **Partial failure (add-to-existing):** only patch with successfully uploaded variants; never leave `extra_images` pointing at a missing URL.
- **Back-compat:** `art.extra_images` may be `null`/`undefined` pre-migration — normalize to `[]` everywhere.
- **Remove last extra:** collapses to single-image (`extra_images = []`), strip hides.
- **Remove/reorder cover:** next image promotes to cover; top-level columns updated accordingly.
- **Cap:** `MAX_VARIANTS = 8` constant in `admin.js`; drop zone rejects beyond cap.
- **Compression errors:** reuse existing per-file `compressImage` error handling in a loop.

## 8. Testing & Acceptance

- Single-image upload still creates one row with `extra_images = []` and renders exactly like today.
- Multi-image upload (2–4) creates one card with `×N` badge; lightbox shows N thumbs and switches correctly; zoom/full-quality follows the active variant.
- Add-variant to an existing single-image artwork promotes it to multi-variant without duplicating cards.
- Remove/reorder variants persists after reload (`updateArtwork` round-trip).
- Filters, sort, search, NSFW mode, and likes still operate per-artwork (variant count does not affect them).
- Demo mode (no Supabase) — include `extra_images` in demo rows if needed for manual testing.

## 9. Files to Change

- `gallery/js/supabase.js` — schema comment, `updateArtwork` helper.
- `gallery/js/admin.js` — multi-file input/drop, preview strip, reorder, batch upload, manage-variants flow.
- `gallery/js/gallery.js` — variant badge on cards.
- `gallery/js/lightbox.js` — variant strip, active-variant switching.
- `gallery/index.html` — variant strip container, manage-variants entry point.
- `gallery/style.css` — badge, strip, manager styling.
- Supabase: one migration SQL (`extra_images` column).

## 10. Out of Scope

- Per-variant metadata overrides (e.g. per-variant NSFW flag, tags, title).
- Per-variant likes or comments.
- Video or non-image variants.
- Reordering artworks themselves (unrelated to variant ordering).
