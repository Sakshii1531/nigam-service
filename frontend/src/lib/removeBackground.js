// Removes a plain (single-colour) background from a product picture, in the
// browser, so an admin can upload a normal product photo and get a cut-out with
// a transparent background. It handles the common case — a white or light-grey
// studio backdrop — and says so honestly when it cannot (a busy or photographic
// background): then the picture is uploaded as it is, and the admin is told to
// supply one that already has its background removed.
//
// How: sample the picture's border to find the backdrop colour; flood-fill
// inwards from the border across pixels close to that colour (so a white patch
// *inside* the product stays); soften the cut edge; trim the empty margin.

const MAX_SIDE = 1400; // working size; also keeps the upload small
const TOLERANCE = 40; // how far (RGB distance) a pixel may be from the backdrop and still count as backdrop

const distance = (d, i, r, g, b) => Math.hypot(d[i] - r, d[i + 1] - g, d[i + 2] - b);
const median = (values) => values.slice().sort((a, b) => a - b)[Math.floor(values.length / 2)];

async function decode(file) {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();
  return { canvas, ctx, width, height };
}

const toFile = (canvas, name) =>
  new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(new File([blob], `${name.replace(/\.[^.]+$/, '')}.png`, { type: 'image/png' })) : reject(new Error('Could not process the picture.'))), 'image/png'),
  );

/**
 * @returns {{ file: File, status: 'removed' | 'already-transparent' | 'busy-background' | 'nothing-to-remove' | 'too-much-removed' }}
 *   `file` is the cut-out when status is "removed"; otherwise the original, untouched.
 */
export async function removePlainBackground(file, { tolerance = TOLERANCE } = {}) {
  let image;
  try {
    image = await decode(file);
  } catch {
    return { file, status: 'busy-background' };
  }
  const { canvas, ctx, width, height } = image;
  const frame = ctx.getImageData(0, 0, width, height);
  const d = frame.data;
  const total = width * height;

  // Already has a transparent background: nothing to do.
  let see = 0;
  for (let i = 3; i < d.length; i += 4) if (d[i] < 250) see += 1;
  if (see / total > 0.01) return { file, status: 'already-transparent' };

  // The backdrop colour: the median of the outer border.
  const ring = [];
  const take = (x, y) => ring.push((y * width + x) * 4);
  for (let x = 0; x < width; x += 1) { take(x, 0); take(x, height - 1); }
  for (let y = 1; y < height - 1; y += 1) { take(0, y); take(width - 1, y); }
  const r = median(ring.map((i) => d[i]));
  const g = median(ring.map((i) => d[i + 1]));
  const b = median(ring.map((i) => d[i + 2]));
  const plain = ring.filter((i) => distance(d, i, r, g, b) <= tolerance * 1.25).length / ring.length;
  if (plain < 0.9) return { file, status: 'busy-background' };

  // Flood-fill the backdrop inwards from the border.
  const isBackdrop = new Uint8Array(total);
  const queue = new Int32Array(total);
  let head = 0;
  let tail = 0;
  const push = (p) => {
    if (isBackdrop[p]) return;
    if (distance(d, p * 4, r, g, b) > tolerance) return;
    isBackdrop[p] = 1;
    queue[tail] = p;
    tail += 1;
  };
  for (let x = 0; x < width; x += 1) { push(x); push((height - 1) * width + x); }
  for (let y = 0; y < height; y += 1) { push(y * width); push(y * width + width - 1); }
  while (head < tail) {
    const p = queue[head];
    head += 1;
    const x = p % width;
    const y = (p - x) / width;
    if (x > 0) push(p - 1);
    if (x < width - 1) push(p + 1);
    if (y > 0) push(p - width);
    if (y < height - 1) push(p + width);
  }
  if (tail === 0 || tail / total < 0.03) return { file, status: 'nothing-to-remove' };
  if (tail / total > 0.97) return { file, status: 'too-much-removed' };

  // Cut the backdrop out; give the pixels just inside the edge a soft, partial transparency.
  const soft = tolerance * 1.8;
  let minX = width; let minY = height; let maxX = 0; let maxY = 0;
  for (let p = 0; p < total; p += 1) {
    const i = p * 4;
    if (isBackdrop[p]) {
      d[i + 3] = 0;
      continue;
    }
    const x = p % width;
    const y = (p - x) / width;
    const nearBackdrop = (x > 0 && isBackdrop[p - 1]) || (x < width - 1 && isBackdrop[p + 1]) || (y > 0 && isBackdrop[p - width]) || (y < height - 1 && isBackdrop[p + width]);
    if (nearBackdrop) {
      const away = distance(d, i, r, g, b);
      if (away < soft) d[i + 3] = Math.round(255 * Math.min(1, Math.max(0, (away - tolerance) / (soft - tolerance))));
    }
    if (d[i + 3] > 8) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  ctx.putImageData(frame, 0, 0);

  // Trim the empty margin, leaving a little breathing room.
  const pad = Math.round(Math.max(maxX - minX, maxY - minY) * 0.04);
  const sx = Math.max(0, minX - pad);
  const sy = Math.max(0, minY - pad);
  const sw = Math.min(width, maxX + pad + 1) - sx;
  const sh = Math.min(height, maxY + pad + 1) - sy;
  const out = document.createElement('canvas');
  out.width = sw;
  out.height = sh;
  out.getContext('2d').drawImage(canvas, sx, sy, sw, sh, 0, 0, sw, sh);
  return { file: await toFile(out, file.name || 'picture'), status: 'removed' };
}

export const BACKGROUND_MESSAGES = {
  removed: 'Background removed. Check the preview — if it cut into the product, turn the option off and upload a picture that already has a transparent background.',
  'already-transparent': 'This picture already has a transparent background.',
  'busy-background': 'The background is not a single plain colour, so it could not be removed automatically. The picture was uploaded as it is — please upload one with the background already removed (a PNG).',
  'nothing-to-remove': 'No plain background was found; the picture was uploaded as it is.',
  'too-much-removed': 'Removing the background would have erased almost the whole picture, so it was uploaded as it is.',
};
