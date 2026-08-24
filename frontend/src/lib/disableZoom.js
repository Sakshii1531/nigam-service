/**
 * Blocks the zoom gestures the viewport meta tag cannot.
 *
 * `user-scalable=no` is honoured by Android and desktop browsers but ignored by
 * iOS Safari since iOS 10, so pinch-to-zoom still works there. Safari exposes
 * its own non-standard `gesture*` events for pinches, and a two-finger
 * `touchmove` covers the browsers that don't. Ctrl/⌘ + wheel is the desktop
 * trackpad pinch.
 *
 * Deliberately NOT blocked: the browser's own ⌘/Ctrl +/- zoom. It is a browser
 * chrome feature rather than a page gesture, cannot be suppressed reliably, and
 * it is the control people who need larger text actually use — taking it away
 * would lock them out of the app entirely.
 */
export function disableZoom() {
  if (typeof window === 'undefined') return;

  // Safari's pinch gestures.
  for (const type of ['gesturestart', 'gesturechange', 'gestureend']) {
    document.addEventListener(type, (e) => e.preventDefault(), { passive: false });
  }

  // Pinch on browsers without the gesture events: any touch with a second
  // finger down. Single-finger scrolling is untouched.
  document.addEventListener(
    'touchmove',
    (e) => {
      if (e.touches.length > 1) e.preventDefault();
    },
    { passive: false },
  );

  // Double-tap to zoom, for the browsers that still do it despite
  // `touch-action: manipulation`.
  let lastTouchEnd = 0;
  document.addEventListener(
    'touchend',
    (e) => {
      const now = Date.now();
      if (now - lastTouchEnd <= 300) e.preventDefault();
      lastTouchEnd = now;
    },
    { passive: false },
  );

  // Trackpad pinch / ctrl+wheel on desktop.
  document.addEventListener(
    'wheel',
    (e) => {
      if (e.ctrlKey || e.metaKey) e.preventDefault();
    },
    { passive: false },
  );
}
