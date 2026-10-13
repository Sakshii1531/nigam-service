import fs from 'node:fs';
import path from 'node:path';

const resultsPath = process.argv[2];

const escapeCommand = (value) =>
  String(value)
    .replaceAll('%', '%25')
    .replaceAll('\r', '%0D')
    .replaceAll('\n', '%0A');

const emitError = (file, title, message) => {
  const properties = [
    file ? `file=${escapeCommand(file)}` : '',
    `title=${escapeCommand(title)}`,
  ]
    .filter(Boolean)
    .join(',');
  console.log(
    `::error ${properties}::${escapeCommand(message).slice(0, 8000)}`,
  );
};

if (!resultsPath || !fs.existsSync(resultsPath)) {
  emitError('', 'Jest failed', 'Jest exited before producing its JSON results file.');
  process.exit(0);
}

const results = JSON.parse(fs.readFileSync(resultsPath, 'utf8'));

for (const suite of results.testResults ?? []) {
  const file = path.relative(process.cwd(), suite.name ?? '');
  let reportedAssertion = false;

  for (const assertion of suite.assertionResults ?? []) {
    if (assertion.status !== 'failed') continue;
    reportedAssertion = true;
    const title = [...(assertion.ancestorTitles ?? []), assertion.title]
      .filter(Boolean)
      .join(' > ');
    emitError(file, title || 'Jest assertion failed', (assertion.failureMessages ?? []).join('\n'));
  }

  if (!reportedAssertion && suite.status === 'failed') {
    emitError(file, 'Jest suite failed', suite.message || 'The suite failed before an assertion completed.');
  }
}

if ((results.numFailedTests ?? 0) === 0 && (results.numFailedTestSuites ?? 0) === 0) {
  emitError('', 'Jest failed', 'Jest returned a failure without recording a failed suite.');
}
