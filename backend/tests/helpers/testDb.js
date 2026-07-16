// Every *.test.js file that needs a real Mongo connection gets its OWN database
// (base name + a per-file suffix), not one shared `nigam_care_test` for all of
// them. Each file independently calls dropDatabase()+disconnect() in its own
// afterAll — sharing one physical database meant that if Jest's teardown for one
// file overlapped even slightly with another file's setup/tests (observed as an
// intermittent full-suite failure that never reproduced when a file ran alone),
// one file's cleanup could wipe data another file was actively using. Per-file
// databases make that class of race impossible by construction.
export function testDbUri(suffix) {
  const base = process.env.MONGODB_TEST_URI || 'mongodb://127.0.0.1:27017/nigam_care_test';
  return `${base}_${suffix}`;
}
