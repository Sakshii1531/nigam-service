import { describe, it, expect, afterEach } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { storeUploadedFile, LOCAL_UPLOAD_DIR, isFileStorageConfigured } from '../src/modules/shared/fileUpload.js';

// CLOUDINARY_* env vars are unset in the test environment (.env.example defaults), so
// this exercises the local-disk fallback branch — the Cloudinary branch is
// code-reviewed, not unit-tested here, since it needs real account credentials
// (and a real network call) to run for real.
describe('storeUploadedFile (local-disk backend)', () => {
  it('is using the local-disk backend in this test environment', () => {
    expect(isFileStorageConfigured).toBe(false);
  });

  it('writes the buffer to LOCAL_UPLOAD_DIR and returns a /uploads/ URL', async () => {
    const file = { originalname: 'photo.png', mimetype: 'image/png', buffer: Buffer.from('fake-image-bytes') };
    const url = await storeUploadedFile(file);

    expect(url).toMatch(/^\/uploads\/[\w-]+\.png$/);
    const savedPath = path.join(LOCAL_UPLOAD_DIR, path.basename(url));
    expect(fs.existsSync(savedPath)).toBe(true);
    expect(fs.readFileSync(savedPath, 'utf8')).toBe('fake-image-bytes');

    fs.unlinkSync(savedPath);
  });

  it('converts a valid image (PNG) to WebP format', async () => {
    // 1x1 transparent PNG base64 representation
    const pngBuffer = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=',
      'base64'
    );
    const file = { originalname: 'test-image.png', mimetype: 'image/png', buffer: pngBuffer };
    const url = await storeUploadedFile(file);

    expect(url).toMatch(/^\/uploads\/[\w-]+\.webp$/);
    const savedPath = path.join(LOCAL_UPLOAD_DIR, path.basename(url));
    expect(fs.existsSync(savedPath)).toBe(true);

    const content = fs.readFileSync(savedPath);
    expect(content.toString('utf8', 0, 4)).toBe('RIFF');
    expect(content.toString('utf8', 8, 12)).toBe('WEBP');

    fs.unlinkSync(savedPath);
  });

  it('rejects when no file is provided', async () => {
    await expect(storeUploadedFile(null)).rejects.toThrow(/No file provided/);
  });

  afterEach(() => {
    // Belt-and-suspenders cleanup in case an assertion above throws before its own unlink.
    for (const f of fs.readdirSync(LOCAL_UPLOAD_DIR)) {
      if (f.startsWith('.')) continue;
      fs.unlinkSync(path.join(LOCAL_UPLOAD_DIR, f));
    }
  });
});

// Same fail-fast-in-production precedent as env.js's JWT secrets (Phase 11) and
// otpProvider.js's smsindiahub branch: an unconfigured file store must never
// silently fall back to local disk in production (most hosts' filesystems are
// ephemeral — uploads would vanish on the next restart/deploy), so this needs a
// real child process per NODE_ENV to verify precisely, same pattern as env.test.js.
function runStoreUploadedFile(nodeEnv) {
  const backendRoot = fileURLToPath(new URL('..', import.meta.url));
  const script = `
    import('./src/modules/shared/fileUpload.js').then(async ({ storeUploadedFile }) => {
      const file = { originalname: 'photo.png', mimetype: 'image/png', buffer: Buffer.from('x') };
      try {
        const url = await storeUploadedFile(file);
        console.log('STORE_OK:', url);
      } catch (err) {
        console.error('STORE_ERROR:', err.message);
        process.exit(1);
      }
    });
  `;
  return spawnSync(process.execPath, ['--experimental-vm-modules', '-e', script], {
    cwd: backendRoot,
    env: {
      ...process.env,
      NODE_ENV: nodeEnv,
      JWT_ACCESS_SECRET: 'x',
      JWT_REFRESH_SECRET: 'x',
      MONGODB_URI: 'mongodb://x/x',
      CLOUDINARY_CLOUD_NAME: '',
      CLOUDINARY_API_KEY: '',
      CLOUDINARY_API_SECRET: '',
    },
    encoding: 'utf8',
  });
}

describe('storeUploadedFile — unconfigured Cloudinary', () => {
  it('falls back to local disk outside production', () => {
    const result = runStoreUploadedFile('development');
    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/STORE_OK: \/uploads\//);

    // Cleanup: this ran in a separate process, so the parent describe block's
    // afterEach never sees it — same physical LOCAL_UPLOAD_DIR though.
    const url = result.stdout.match(/STORE_OK: (\/uploads\/\S+)/)[1];
    fs.unlinkSync(path.join(LOCAL_UPLOAD_DIR, path.basename(url)));
  });

  it('refuses to silently use local disk in production — throws instead', () => {
    const result = runStoreUploadedFile('production');
    expect(result.status).not.toBe(0);
    expect(result.stderr).toMatch(/File storage is not configured/);
  });
});
