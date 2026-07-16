import { describe, it, expect, beforeAll } from '@jest/globals';
import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import mongoose from 'mongoose';

// Phase 1 exit criterion: every *.model.js under src/modules compiles (registers
// with mongoose without throwing) — walks the tree instead of a hand-maintained
// import list so newly added models are covered automatically.
const modulesDir = fileURLToPath(new URL('../src/modules', import.meta.url));

function findModelFiles(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return findModelFiles(full);
    return entry.endsWith('.model.js') ? [full] : [];
  });
}

const modelFiles = findModelFiles(modulesDir);

describe('Mongoose models', () => {
  beforeAll(async () => {
    // Sequential, not Promise.all — Jest's --experimental-vm-modules linker races
    // (and throws "module not been linked") when many dynamic imports that share a
    // common dependency (mongoose) resolve concurrently.
    for (const file of modelFiles) {
      await import(pathToFileURL(file).href);
    }
  });

  it('found model files under every module', () => {
    expect(modelFiles.length).toBeGreaterThan(60);
  });

  it('registers every model with mongoose with no duplicate names', () => {
    const names = mongoose.modelNames();
    expect(new Set(names).size).toBe(names.length);
    // one model registered per *.model.js file (Counter/AuditLog/etc. included)
    expect(names.length).toBe(modelFiles.length);
  });

  it('every model exposes a working toJSON shape (id, no _id/__v) where the standard plugin was applied', () => {
    const skipPlugin = new Set(['Counter', 'AuditLog', 'PlatformSettings', 'AppSetting', 'CMSPage', 'Otp', 'RefreshToken']);
    for (const name of mongoose.modelNames()) {
      if (skipPlugin.has(name)) continue;
      const Model = mongoose.model(name);
      const doc = new Model({});
      const json = doc.toJSON();
      expect(json).toHaveProperty('id');
      expect(json).not.toHaveProperty('_id');
      expect(json).not.toHaveProperty('__v');
    }
  });

  it('relative model file list is stable (documents the collection count for DATA_MODEL.md)', () => {
    const relPaths = modelFiles.map((f) => relative(modulesDir, f)).sort();
    expect(relPaths.length).toBe(mongoose.modelNames().length);
  });
});
