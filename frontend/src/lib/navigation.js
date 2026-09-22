// Shared "back" behavior for header back buttons across the app.
//
// A plain `navigate(-1)` is correct for the common case (the customer
// actually came from another page in this app) but goes nowhere — silently
// — if this page is the first entry in the tab's history, e.g. opened from a
// deep link, a notification, or a fresh page reload. `goBack` picks between
// the two: react-router's BrowserRouter stores an incrementing `idx` in
// `history.state` for every in-app navigation, starting at 0 for the first
// entry it manages, so `idx > 0` means there is really something to go back
// to; otherwise we fall back to a fixed destination instead of leaving the
// customer stuck on a dead button.
export function goBack(navigate, fallback) {
  const idx = window.history.state?.idx;
  if (typeof idx === "number" && idx > 0) {
    navigate(-1);
  } else {
    navigate(fallback);
  }
}
