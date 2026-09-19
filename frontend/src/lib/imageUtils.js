/**
 * Utility functions for image processing, client-side WebP conversion,
 * and camera frame capture.
 */

/**
 * Format bytes into human-readable string (KB, MB).
 */
export function formatFileSize(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

/**
 * Converts any image File or Blob to WebP format using HTML5 Canvas.
 * Optionally downscales large images exceeding maxDimension to drastically reduce payload.
 *
 * @param {File|Blob} fileOrBlob - Input image file or blob
 * @param {Object} [options]
 * @param {number} [options.quality=0.82] - WebP quality (0.0 to 1.0)
 * @param {number} [options.maxDimension=1600] - Max width/height in px (preserves aspect ratio)
 * @returns {Promise<{
 *   file: File,
 *   blob: Blob,
 *   previewUrl: string,
 *   originalSize: number,
 *   webpSize: number,
 *   compressionRatio: number,
 *   width: number,
 *   height: number
 * }>}
 */
export async function convertToWebP(fileOrBlob, options = {}) {
  const { quality = 0.82, maxDimension = 1600 } = options;
  const originalSize = fileOrBlob.size || 0;

  return new Promise((resolve, reject) => {
    // If it's already a small WebP file (< 300KB), we could keep it, but running through
    // canvas normalizes EXIF orientation and guarantees standard format.
    const objectUrl = URL.createObjectURL(fileOrBlob);
    const img = new Image();

    img.onload = () => {
      URL.revokeObjectURL(objectUrl);

      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;

      // Scale down if dimensions exceed maxDimension
      if (width > maxDimension || height > maxDimension) {
        if (width > height) {
          height = Math.round((height * maxDimension) / width);
          width = maxDimension;
        } else {
          width = Math.round((width * maxDimension) / height);
          height = maxDimension;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');

      if (!ctx) {
        // Fallback: return original file
        console.warn('[imageUtils] 2D context unavailable, falling back to original file');
        return resolve({
          file: fileOrBlob instanceof File ? fileOrBlob : new File([fileOrBlob], 'photo.jpg', { type: fileOrBlob.type }),
          blob: fileOrBlob,
          previewUrl: URL.createObjectURL(fileOrBlob),
          originalSize,
          webpSize: originalSize,
          compressionRatio: 0,
          width,
          height,
        });
      }

      // Draw with high quality smoothing
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(img, 0, 0, width, height);

      // Attempt WebP conversion
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            console.warn('[imageUtils] toBlob returned null, falling back to original');
            return resolve({
              file: fileOrBlob instanceof File ? fileOrBlob : new File([fileOrBlob], 'photo.jpg', { type: fileOrBlob.type }),
              blob: fileOrBlob,
              previewUrl: URL.createObjectURL(fileOrBlob),
              originalSize,
              webpSize: originalSize,
              compressionRatio: 0,
              width,
              height,
            });
          }

          const originalName = fileOrBlob.name || 'photo.jpg';
          const baseName = originalName.replace(/\.[^.]+$/, '');
          const webpFileName = `${baseName}.webp`;

          const webpFile = new File([blob], webpFileName, {
            type: 'image/webp',
            lastModified: Date.now(),
          });

          const webpSize = webpFile.size;
          const compressionRatio = originalSize > 0
            ? Math.max(0, Math.round(((originalSize - webpSize) / originalSize) * 100))
            : 0;

          const previewUrl = URL.createObjectURL(blob);

          resolve({
            file: webpFile,
            blob,
            previewUrl,
            originalSize,
            webpSize,
            compressionRatio,
            width,
            height,
          });
        },
        'image/webp',
        quality
      );
    };

    img.onerror = (err) => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Failed to load image for WebP conversion: ${err?.message || 'Unknown error'}`));
    };

    img.src = objectUrl;
  });
}

/**
 * Captures a single video frame from an HTMLVideoElement and converts it to WebP.
 *
 * @param {HTMLVideoElement} videoElement
 * @param {Object} [options]
 * @returns {Promise<{
 *   file: File,
 *   blob: Blob,
 *   previewUrl: string,
 *   originalSize: number,
 *   webpSize: number,
 *   compressionRatio: number,
 *   width: number,
 *   height: number
 * }>}
 */
export async function captureFrameToWebP(videoElement, options = {}) {
  const { quality = 0.82, maxDimension = 1600 } = options;

  let width = videoElement.videoWidth || 1280;
  let height = videoElement.videoHeight || 720;

  if (width > maxDimension || height > maxDimension) {
    if (width > height) {
      height = Math.round((height * maxDimension) / width);
      width = maxDimension;
    } else {
      width = Math.round((width * maxDimension) / height);
      height = maxDimension;
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  if (!ctx) throw new Error('Canvas 2D context unavailable');

  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(videoElement, 0, 0, width, height);

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) return reject(new Error('Failed to capture frame as WebP'));

        const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
        const filename = `camera-capture-${timestamp}.webp`;
        const file = new File([blob], filename, {
          type: 'image/webp',
          lastModified: Date.now(),
        });

        resolve({
          file,
          blob,
          previewUrl: URL.createObjectURL(blob),
          originalSize: blob.size,
          webpSize: blob.size,
          compressionRatio: 0,
          width,
          height,
        });
      },
      'image/webp',
      quality
    );
  });
}
