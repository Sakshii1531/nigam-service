// Mongoose only registers a model when its file is actually imported somewhere in
// the running process — `.populate('someRef')` throws "Schema hasn't been
// registered" if nothing happened to import that ref's model yet. Rather than
// each service file having to remember to import every model it might ever
// populate (and this breaking again the next time someone adds a new populate
// call), import every *.model.js once at startup so they're all always registered.
import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';

const modulesDir = fileURLToPath(new URL('../modules', import.meta.url));

function findModelFiles(dir) {
  return readdirSync(dir).flatMap((entry) => {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) return findModelFiles(full);
    return entry.endsWith('.model.js') ? [full] : [];
  });
}

export async function registerAllModels() {
  const files = findModelFiles(modulesDir);
  for (const file of files) {
    await import(pathToFileURL(file).href);
  }
  return files.length;
}
