import React, { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";
import CustomerTopNav from "./CustomerTopNav";
import TechTopNav from "./TechTopNav";

/**
 * AppChrome — renders the desktop (lg+) top navigation for whichever panel the
 * current route belongs to.
 *
 * The nav used to be pasted into each page, which meant the ~50 pages that never
 * got around to it rendered a stretched phone layout with no navigation at all on
 * a desktop screen. Mounting it once from the router guarantees every customer and
 * technician route gets the same chrome; the matching top offset lives in
 * index.css against body.customer-app-active / body.tech-app-active, so pages
 * don't each have to remember a padding class either.
 *
 * Auth and marketing routes are excluded — they're full-bleed layouts of their own
 * and there is nothing to navigate to yet.
 */

const CUSTOMER_CHROMELESS = new Set([
  "/", "/login", "/app", "/app/login", "/verify-otp",
  "/forgot-password", "/reset-password", "/onboarding",
  "/home", "/about-ncc",
]);

const TECH_CHROMELESS = new Set([
  "/technician/login", "/technician/verify-otp",
  "/technician/forgot-password", "/technician/apply",
]);

/** Longest-prefix match wins, so /profile doesn't shadow /profile-something. */
const CUSTOMER_TABS = [
  ["/categories", "categories"],
  ["/services", "categories"],
  ["/all-services", "categories"],
  ["/cleaning-services", "categories"],
  ["/appliance-services", "categories"],
  ["/all-brands", "categories"],
  ["/buy", "buy"],
  ["/buy-new", "buy"],
  ["/buy-product", "buy"],
  ["/product-details", "buy"],
  ["/extend-warranty", "buy"],
  ["/bookings", "bookings"],
  ["/my-bookings", "bookings"],
  ["/booking", "bookings"],
  ["/book/", "bookings"],
  ["/profile", "account"],
  ["/edit-profile", "account"],
  ["/saved-addresses", "account"],
  ["/help-support", "account"],
  ["/faqs", "account"],
  ["/payment-methods", "account"],
  ["/notification-settings", "account"],
  ["/my-orders", "account"],
  ["/my-wishlist", "account"],
  ["/wishlist", "account"],
  ["/coupons", "account"],
  ["/rewards", "account"],
  ["/refer-earn", "account"],
  ["/membership-plans", "account"],
];

const TECH_TABS = [
  ["/technician/raise-part-request", "requests"],
  ["/technician/inventory", "inventory"],
  ["/technician/schedule", "schedule"],
  ["/technician/profile", "profile"],
  ["/technician/personal-info", "profile"],
  ["/technician/settings", "profile"],
  ["/technician/payout-settings", "profile"],
  ["/technician/earnings", "profile"],
  ["/technician/analytics", "profile"],
  ["/technician/academy", "profile"],
  ["/technician/help-support", "profile"],
  ["/technician/announcements", "profile"],
  ["/technician/skills", "profile"],
  ["/technician/verification", "profile"],
  ["/technician/partner-level", "profile"],
];

function matchTab(pathname, table, fallback) {
  let best = fallback;
  let bestLen = 0;
  for (const [prefix, tab] of table) {
    if (pathname === prefix || pathname.startsWith(prefix)) {
      if (prefix.length > bestLen) {
        best = tab;
        bestLen = prefix.length;
      }
    }
  }
  return best;
}

/**
 * True for routes that belong to the customer or technician phone app — the two
 * panels whose pages are authored at phone width and therefore need centring
 * rather than stretching once the viewport gets wide.
 */
export function isPhonePanelRoute(pathname) {
  if (pathname.startsWith("/super-admin") || pathname.startsWith("/brand-admin")) return false;
  if (pathname === "/home" || pathname === "/about-ncc") return false;
  // Login, OTP and the partner application build their own full-bleed desktop
  // layouts (split hero + form). Centring those inside a column would strand
  // their background art in the middle of the screen.
  if (CUSTOMER_CHROMELESS.has(pathname) || TECH_CHROMELESS.has(pathname)) return false;
  return true;
}

/**
 * Routes that lay out as a browsable grid — catalogues, dashboards, job lists.
 * These earn the full 1280px; everything else in the two panels is a form, a
 * settings list or a detail view, where a 1280px-wide text input is worse than a
 * phone-width one. Those get a reading-width column instead.
 */
const WIDE_ROUTES = [
  "/dashboard", "/categories", "/services", "/all-services",
  "/cleaning-services", "/appliance-services", "/all-brands",
  "/buy", "/buy-new", "/buy-product", "/product-details",
  "/extend-warranty", "/partner-warranty", "/bookings", "/book/",
  "/service-details", "/membership-plans", "/rewards-play-zone",
  "/my-wishlist", "/wishlist", "/my-orders",
  "/technician/dashboard", "/technician/active-job", "/technician/schedule",
  "/technician/analytics", "/technician/academy", "/technician/inventory",
  "/technician/raise-part-request", "/technician/earnings",
  "/technician/billing-estimate", "/technician/apply",
];

/** Tailwind max-width class for the panel container on a given route. */
export function panelWidthClass(pathname) {
  const wide = WIDE_ROUTES.some((r) => pathname === r || pathname.startsWith(r + "/") || (r.endsWith("/") && pathname.startsWith(r)));
  return wide ? "max-w-screen-xl" : "max-w-4xl";
}

function pickNav(pathname) {
  if (pathname.startsWith("/technician")) {
    if (TECH_CHROMELESS.has(pathname)) return null;
    return <TechTopNav activePage={matchTab(pathname, TECH_TABS, "jobs")} />;
  }
  if (pathname.startsWith("/super-admin") || pathname.startsWith("/brand-admin")) return null;
  if (CUSTOMER_CHROMELESS.has(pathname)) return null;
  return <CustomerTopNav activePage={matchTab(pathname, CUSTOMER_TABS, "home")} />;
}

const AppChrome = () => {
  const { pathname } = useLocation();
  const nav = pickNav(pathname);

  // index.css keys the 4rem desktop top offset off this class rather than off the
  // panel's body class, so pages that render no navbar (login, OTP) don't get a
  // 4rem strip of empty page above their full-bleed hero.
  //
  // useLayoutEffect, not useEffect: the class drives #root's padding-top, so
  // applying it after paint let two frames render with the content 64px too high
  // and then jump. This is a client-only SPA, so there is no SSR warning to dodge.
  useLayoutEffect(() => {
    document.body.classList.toggle("app-has-topnav", nav !== null);
  }, [nav]);

  return nav;
};

export default AppChrome;
