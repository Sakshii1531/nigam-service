# Phase 17 — Images Through Cloudinary

| | |
|---|---|
| **Status** | ✅ Done (2026-09-25) |
| **Depends on** | Phase 16 |

## Goal

Every image an admin or customer adds is uploaded through `POST /api/v1/uploads` (Cloudinary; local disk only in development) and stored as a URL. Base64 image data is never saved in the database. Appliance pictures on the AMC / warranty / Buy screens come from admin-uploaded category images, falling back to the bundled artwork.

---

## Tasks

- [x] One shared upload helper (`lib/uploadImage.js`) + image-field component: pick file → upload → URL, with progress and error states
- [x] Replace base64 (`readAsDataURL`) in super-admin Products (2), CMS editor (tiles, banners, brand cards, stories — 7) and the customer product-review photo
- [x] `Category.imageUrl`: upload in Master Catalogue → category editor; the AMC and warranty appliance pickers and the Buy hub use it before the bundled artwork
- [x] Backend guard: product, CMS and category image fields refuse `data:` URLs (400), so base64 can't come back
- [x] Tests: upload returns a URL; the image fields refuse base64

---

## Implementation Log

| Date | Commit | Notes |
|---|---|---|
| 2026-09-25 | `a08a6dc` | 10 base64 image paths moved to uploads; `Category.imageUrl`; backend refuses base64 on 10 image fields. `catalogAdmin.test.js` +2 tests |

**How an image is stored now.** The screen calls `uploadImage(file)` (`frontend/src/lib/uploadImage.js`), which does the following:
1. checks the file is an image of 5 MB or less;
2. sends it to `POST /api/v1/uploads`, which stores it on **Cloudinary** (development without Cloudinary keys falls back to `backend/uploads/`);
3. returns the absolute URL, which is what gets saved.

`isImageUrl(value)` tells an uploaded picture from a preset icon name. It replaced six `startsWith("data:image/")` checks that would have failed on a Cloudinary URL.

**Moved from base64 to uploads**

| Screen | Field |
|---|---|
| Super Admin → Products | product photos (up to 5); shows "Uploading…" while it runs |
| CMS → Category chips | chip icon image |
| CMS → Banners | banner image |
| CMS → Brands & Offers | card image |
| CMS → Most Booked / Appliance Services | tile image |
| CMS → Stories | cover image and each slide image |
| Customer → product review | review photo |

(The partner signup already uploaded its Aadhaar photos to Cloudinary server-side, so it was left unchanged.)

**Category pictures.**
- `Category.imageUrl` is new. Master Catalogue → edit category → **Picture** uploads it, shows a preview, and can remove it.
- The AMC and warranty appliance endpoints return it, and the AMC picker, the warranty picker and the Buy hub's "All Appliances" show it, falling back to the bundled artwork when none is uploaded.

**Guard against base64 coming back.** A shared validator (`shared/mediaUrl.js`) refuses `data:` values with 400 *"Upload the image first — embedded (base64) images are not accepted"* on these fields:
- products (`imageUrl`, `images[]`);
- review `photos[]`;
- CMS banners (`imageUrl`), story `mediaUrl` and slide `image`;
- home-tile `imageUrl` and `icon`;
- catalogue category and structure icons, and `Category.imageUrl`.

**Known gaps:**
- Images saved as base64 before this change stay in the database until an admin re-uploads them. The app still displays them, since legacy data URIs still render.
- In development without Cloudinary keys, uploads land on local disk (by design); production refuses uploads if Cloudinary isn't configured.
