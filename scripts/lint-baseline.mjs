// Runs ESLint and fails only if the project got *worse*.
//
// `npm run lint` exits non-zero on this repo today: there is a standing baseline of
// known problems that CLAUDE.md documents and asks contributors not to add to. Gating
// CI on a clean exit would mean CI is red on every PR, which teaches everyone to ignore
// it; dropping lint from CI entirely means nothing notices the baseline creeping up.
// So the gate is the count.
//
// When the count drops, this says so and passes — lower BASELINE (here and in
// CLAUDE.md) in the same commit that fixes the problems.

import { spawnSync } from 'node:child_process';

const BASELINE = 11;

const run = spawnSync('npx', ['eslint', '.', '-f', 'json'], {
  encoding: 'utf8',
  maxBuffer: 32 * 1024 * 1024,
});

// ESLint exits 1 when it reports problems, which is the normal case here. Anything
// other than 0 or 1 means it failed to run at all — a config error, a crash — and that
// must not be read as "no problems".
if (run.status !== 0 && run.status !== 1) {
  console.error(`eslint could not run (exit ${run.status})`);
  console.error(run.stderr || run.stdout);
  process.exit(1);
}

let results;
try {
  results = JSON.parse(run.stdout);
} catch {
  console.error('eslint did not produce JSON:');
  console.error(run.stdout.slice(0, 2000));
  console.error(run.stderr.slice(0, 2000));
  process.exit(1);
}

let errors = 0;
let warnings = 0;
for (const file of results) {
  errors += file.errorCount;
  warnings += file.warningCount;
  for (const m of file.messages) {
    const where = `${file.filePath.replace(process.cwd() + '/', '')}:${m.line}:${m.column}`;
    console.log(`  ${m.severity === 2 ? 'error  ' : 'warning'} ${where}  ${m.message}  ${m.ruleId ?? ''}`);
  }
}

const total = errors + warnings;
console.log(`\n${total} problems (${errors} errors, ${warnings} warnings) — baseline ${BASELINE}`);

if (total > BASELINE) {
  console.error(`\n✗ ${total - BASELINE} more than the baseline. Fix what this change added.`);
  process.exit(1);
}

if (total < BASELINE) {
  console.log(`\n✓ ${BASELINE - total} fewer than the baseline — lower BASELINE to ${total} in scripts/lint-baseline.mjs and CLAUDE.md.`);
} else {
  console.log('\n✓ at the baseline');
}
