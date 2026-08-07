import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

const BASE_NAME = 'NIGAM SERVICE COMPANY';

function getPanelLabel(pathname) {
  if (pathname.startsWith('/super-admin')) return `${BASE_NAME} - ADMIN`;
  if (pathname.startsWith('/brand-admin')) return `${BASE_NAME} - BRAND`;
  if (pathname.startsWith('/technician')) return `${BASE_NAME} - TECHNICIAN`;
  return `${BASE_NAME} - CUSTOMER`;
}

/**
 * Sets the browser tab title based on the current route.
 * Since the full title is long, it runs a marquee/scroll effect
 * so users can read the complete name in the tab.
 */
export function usePageTitle() {
  const { pathname } = useLocation();

  useEffect(() => {
    const fullTitle = getPanelLabel(pathname);

    // Generous padding gives the eye a rest between loops
    const padded = `${fullTitle}        `;
    let index = 0;
    let intervalId;

    const scroll = () => {
      // Show a 40-character window — wider window = less choppy
      const display = (padded + padded).slice(index, index + 40);
      document.title = display;
      index = (index + 1) % padded.length;
    };

    // Show full static title first, then begin slow smooth scroll after 2s
    document.title = fullTitle;
    const startDelay = setTimeout(() => {
      intervalId = setInterval(scroll, 380); // 380ms per step = slow & readable
    }, 2000);

    return () => {
      clearTimeout(startDelay);
      clearInterval(intervalId);
      document.title = fullTitle; // restore on unmount/route change
    };
  }, [pathname]);
}
