import { describe, it, expect, afterEach } from '@jest/globals';
import fs from 'node:fs';
import path from 'node:path';
import { storeUploadedFile, LOCAL_UPLOAD_DIR, isS3Configured } from '../src/modules/shared/fileUpload.js';

// S3_* env vars are unset in the test environment (.env.example defaults), so this
// exercises the local-disk fallback branch — the S3 branch is code-reviewed, not
// unit-tested here, since it needs real bucket credentials to run for real.
describe('storeUploadedFile (local-disk backend)', () => {
  it('is using the local-disk backend in this test environment', () => {
    expect(isS3Configured).toBe(false);
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
