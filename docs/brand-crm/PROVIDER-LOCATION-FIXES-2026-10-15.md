# Provider availability, customer location and warranty allocation — 15 October 2026

## Reported problem and findings

- The Partner dashboard's availability control was inside a mobile-only hero,
  so it disappeared at desktop widths.
- NCC's provider page fetched a capped first page once, then filtered locally.
  It could omit older providers and retain stale availability. Search did not
  include phone/email despite those identifiers being useful for support.
- The reported Ujjawal Provider was already Active and Available. The reported
  `NCCW-2026-000001` / `NCCJ-2026-000001` was unassigned: job category `AC`
  did not exactly equal the provider's stored display skill `AC Repair`.
- That claim has a typed Indore service address but no customer GPS pin. GPS
  improves distance/navigation; its absence was not the sole assignment blocker.
- Saved Addresses had add/edit controls but used typed fields and fabricated
  Delhi defaults. Warranty intake had no map/GPS capture and did not preserve
  numeric values in its new-address serialization. The header location selector
  discarded saved coordinates and truncated reverse-geocoded address text.

## Changes

- Desktop now exposes Job availability with online/offline status, loading and
  mutation feedback. Busy remains distinct from Available. Going online can
  capture device GPS, preserve the approved service city, and retry queued work
  even if availability was already Available. Permission denial is reported;
  it does not silently pretend a GPS fix was obtained.
- NCC and Partner status refresh every 10 seconds while visible and on focus.
  NCC reads all API pages before local filtering and searches names, IDs,
  phone/email and skills. An open NCC provider profile also refreshes status.
- Warranty matching accepts exact normalized catalogue keys/display names and
  their legacy `Repair` label. It continues to require the correct product
  skill, Active/Available status, applicable brand authorization and service area.
  It does not use unrestricted substring matching or generalist fallback for
  warranty work. Zero-valued coordinates remain real coordinates in dispatch.
- Shared address controls appear in Saved Addresses and new warranty service
  addresses: live GPS, Google reverse geocoding, active service-state/city
  selectors, pincode and a draggable/clickable Google map pin. No fabricated
  Delhi address/pincode is filled into a new saved address.
- Google browser geocoding uses the Maps JavaScript Geocoder with a shared
  loader instead of directly calling the REST geocoding endpoint with a
  browser-restricted key. Full readable address and saved coordinates survive
  header selection and address edits. This follows Google's [browser API key
  and geocoder guidance](https://developers.google.com/maps/faq).
- The map prevents confirmation of an untouched default centre, blocks
  confirmation during lookup, clears old details when the pin changes and
  ignores stale reverse-geocoding callbacks. Errors leave manual address entry
  available. Saving/editing preserves coordinates, including zero values.
- Header location selection and warranty intake link to add/edit saved addresses.
  Warranty address choices show whether a real visit pin exists.

## How to retest

1. Restart the backend if it is not running under nodemon; reload the frontend.
2. Partner → dashboard: find Job availability on desktop, go offline then
   online, and allow location if possible. Keep the dashboard open to accept
   an eligible offer. NCC's availability should change within about 10 seconds.
   Partner App Settings must permit auto-assignment for going online to drain
   the queue. NCC can also use a claim's Assign partner control to intervene.
3. Customer → Saved Addresses: add/edit, use live location, review the detected
   address, drag the map pin to the doorstep and save. Reload and check the pin.
4. Raise a new Partner Warranty claim using that saved address, or use the same
   GPS/map controls in the claim's new-address section. Check the same pin
   reaches the accepted partner's navigation destination.
5. Follow C-V13–C-V15 and B16 in [MANUAL-TEST-CHECKLIST.md](MANUAL-TEST-CHECKLIST.md).

Existing claims retain their submitted address snapshot. Editing a saved
address does not retrospectively move an already-created service visit. No
customer or provider GPS was invented or copied onto the reported live claim.

## Verification

- Initial backend run: six selected suites / 148 tests passed (allocation,
  assignment engine, provider jobs, NCC provider management, auth/address and
  customer warranty claims). The final allocation suite passed 19 tests after
  adding the zero-coordinate dispatch regression.
- Five selected browser scenarios passed across focused runs: desktop
  availability/GPS persistence with NCC status refresh; customer saved-address
  GPS/map-pin editing and permission denial; `partnerAppWarranty`,
  `warrantyJourney` and `partnerWarranty` customer/partner lifecycle checks.
  SDK/GPS responses in the address integration test are deterministic mocks,
  so they do not certify physical GPS accuracy or every Google project setting.
- A separate check against the running app at `localhost:5175` loaded the actual
  Google SDK and reverse-geocoded a public Indore coordinate: status `OK`,
  address resolved, no captured Google API errors. The API key was not logged.
- Read-only ranking with the corrected code found Ujjawal Provider eligible for
  the reported warranty job (skill score 100, availability Available). No live
  claim was forced assigned and no partner acceptance was simulated.
- The configured Partner App automatic-assignment setting was enabled.
- Backend lint had no errors; targeted frontend lint had no errors (23 warnings
  in the touched older UI/context files). Frontend production build and malware
  scan passed. Historical walkthrough screenshots were restored after testing.
