# Phase 10 — Location / Pincode Pricing Admin

| | |
|---|---|
| **Status** | ✅ Done (2026-09-25) |
| **Depends on** | Phase 7 (seam) |

## Goal

Admins can set a different price and payout for a city or a pincode, see them next to the default, and end an override. This uses the seam proven in Phase 7 (`locationPricing.test.js`).

---

## Tasks

- [x] API: `changeRateSchema` accepts `scope { type: DEFAULT|CITY|PINCODE, value }`; `changeRate()` passes it on; the first version of a new scope needs all four amounts (the modal pre-fills them from the default)
- [x] API: `GET …/offerings/:id` returns `rates: [{ scope, current }]` (the default plus each override); the offerings list shows an override count
- [x] API: end an override (`POST …/offerings/:id/rates/end { scope }` → closes the current version with `effectiveUntil = now`)
- [x] UI: `RateChangeModal` gets a Scope selector (Default · City · Pincode + value; the city list comes from admin Cities); history grouped by scope; a "Local prices" panel in the offering editor; a 📍 badge in the table
- [~] Scheduled-changes view includes non-default scopes (see Deviations)
- [x] Tests: create a CITY override from the admin API → the Jaipur quote uses it; ending it → back to the default; audit logged

---

## Example

Admin → Fan Installation → Local prices → Add → City "Jaipur", ₹279 / ₹170, reason "Jaipur launch". A Jaipur customer sees ₹279 (₹329.22 with GST); everyone else still sees ₹299.

---

## Implementation Log

| Date | Commit | Notes |
|---|---|---|
| 2026-09-25 | `686c217` | Admin API + UI for city / pincode prices. `catalogAdmin.test.js` +4 tests (21 total), `locationPricing.test.js` still green; browser walkthrough ✓ |

**API** (`/api/v1/super-admin/catalogue`)

| Call | What it does |
|---|---|
| `POST …/offerings/:id/rates` + `scope: { type: 'CITY', value: 'Jaipur' }` | New city or pincode price. The first version needs all four amounts; later ones only the changed fields (the rest carry forward, as for the default). |
| `POST …/offerings/:id/rates/end` `{ scope, reason }` | Ends that location's price now. It falls back to CITY, then DEFAULT. The version stays in the history. |
| `GET …/offerings/:id` → `localRates[]` | Active and scheduled location prices, `{ scope, rate, scheduled }` |
| `GET …/offerings` → `localRateCount` | For the 📍 badge |

**Rules**
- A pincode is 6 digits.
- City names are matched case-insensitively, so "JAIPUR" continues Jaipur's version chain instead of starting a new one.
- A location price never clears the offering's ⚠ DEMO flag. That flag is about the default price list.
- An ended location can be added again, even at the same amounts. It gets a fresh version and the closed window stays closed.
- Audit log entries read, for example: `Catalogue: ELEC-FAN-INSTALL city Jaipur rate v1 — ₹279 / payout ₹170 (Jaipur launch)`.

**UI**
- *Change price / payout* modal:
  - **Applies to:** A city (with the admin's Cities as suggestions) or A pincode.
  - A new location starts from the default amounts, labelled "Default ₹299".
  - The button reads **Save local price**.
- **Offering editor → Pricing → Local prices:** a table (location, price, payout, express) with ✎ edit and ⊗ end, plus **Add city / pincode price**.
- **Offerings table:** a 📍 N badge. **History** already labels each version `CITY: Jaipur`.

**Worked example (browser, seeded scratch DB):**
1. Admin → Master Catalogue → Electrician → Fan Installation → Pricing → **Add city / pincode price**.
2. Enter City *Jaipur*, ₹279 / ₹170, reason "Jaipur launch", then **Save local price** (`screenshots/phase-10/1-add-city-price.png`).
3. The panel shows *Jaipur ₹279 · ₹170 · ₹99 / ₹50* (`2-local-prices-panel.png`), and the table row gets 📍 1 (`3-table-badge.png`).
4. `POST /catalog/quote` with `location.city = "Jaipur"` returns **₹279**; other cities still get ₹299.
5. ⊗ End with reason "Promo over": the panel shows "No local prices", and History keeps the `CITY: Jaipur` version (`4-history.png`).

**Deviations from plan:** the "scheduled change" line in the offerings table still shows only the *default* list's next price. Scheduled local prices appear in the Local prices panel, marked "Scheduled", instead of being mixed into the default column.

**Known gaps:**
- No bulk upload of local prices (one offering at a time).
- The customer app sends the city from the delivery location; a pincode price applies once the address has a pincode (booking step 4 and the quote after it).
