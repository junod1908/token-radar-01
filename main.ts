// token-radar-01: the entrypoint, and the only file in this repository that talks to the
// outside world. Everything it does falls into four stages, each a small function below:
//
//   1. locate    find the sealed snapshot the caller named (--input, a file or a directory
//                holding snapshot.json) and the directory results belong in (--output,
//                else $MAKEFUN_OUTPUT_DIR, else /output, where the grader mounts it);
//   2. score     parse the snapshot and let lib/model.ts rank its pre-token protocols,
//                refusing to go on when the model hands back a board the gate rejects;
//   3. publish   write board.json and the dashboard's data.js into the output directory,
//                then mirror this repository's dashboard/ and screenshots/ beside them;
//   4. seal      write dossier.json last of all, through the vendored make.fun library,
//                because the scorer rebuilds that file from the finished output and
//                compares it byte for byte: nothing in the output may change after it.
//
// Node 22, standard library only; the TypeScript here is the erasable kind, so plain
// `node main.ts` runs it with no build step:
//
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input ../input/snapshot.json

import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { boardIssue, buildRadar, dataScript, parseSnapshot } from './lib/model.ts';
import { buildDossier } from './vendor/makefun-board.ts';

/** This file's own directory: dashboard/ and screenshots/ are found relative to it. */
const MODULE_DIR = fileURLToPath(new URL('.', import.meta.url));

/**
 * The caps the gate scores under, restated here because the dossier has to be written
 * with exactly them: a 64 KiB budget for its text, at most four screenshots of at most
 * 512 KiB each, and a dashboard of at most 400 files and 4 MiB in all. Only the text
 * budget shapes the dossier's bytes; the rest only refuse.
 */
const DOSSIER_TEXT_LIMIT = 65_536;
const SCREENSHOT_LIMITS = { max: 4, max_bytes: 524_288 };
const DASHBOARD_LIMITS = { max_files: 400, max_bytes: 4_194_304 };

/** The name a screenshot may carry: a letter, digit or underscore, then letters, digits and . _ -, 128 characters at most. */
const SCREENSHOT_NAME = /^[A-Za-z0-9_][A-Za-z0-9._-]{0,127}$/;

/** Say why the run stops, on stderr, and stop with the given exit code. */
function halt(message: string, code: number): never {
  process.stderr.write(message);
  process.exit(code);
}

/**
 * One command-line flag's value: a separate `--name value` wins, then `--name=value`,
 * then the fallback. A trailing `--name` with nothing after it is not the first form.
 */
function flagValue(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  if (at >= 0 && at + 1 < process.argv.length) return process.argv[at + 1]!;
  const joined = process.argv.find((a) => a.startsWith(`--${name}=`));
  return joined === undefined ? fallback : joined.slice(name.length + 3);
}

/**
 * The snapshot file to read: --input names either the file itself (its name ends in
 * .json) or a directory that holds snapshot.json. Stops the run, exit 2, when there is
 * no file at the resolved path.
 */
function locateSnapshot(): string {
  const given = flagValue('input', '/input');
  const file = given.endsWith('.json') ? given : join(given, 'snapshot.json');
  if (!existsSync(file)) {
    halt(`token radar: no snapshot at ${file}: pass --input <snapshot.json|directory> or mount the sealed /input\n`, 2);
  }
  return file;
}

/** Where results go: --output, else $MAKEFUN_OUTPUT_DIR when it is set, else the grader's /output. */
function locateOutput(): string {
  return flagValue('output', process.env.MAKEFUN_OUTPUT_DIR ?? '/output');
}

/**
 * Mirror one directory's regular files into another, creating the target when it is
 * missing, and report the names carried over. Names starting with a dot are skipped
 * (an author's scratch is not part of the entry), and anything that is not a plain
 * file — a subdirectory, a link — is left where it stands. A source that does not
 * exist mirrors nothing and reports an empty list.
 */
function mirrorTree(source: string, target: string): string[] {
  if (!existsSync(source)) return [];
  mkdirSync(target, { recursive: true });
  const carried: string[] = [];
  for (const name of readdirSync(source)) {
    if (name.startsWith('.')) continue;
    const from = join(source, name);
    if (!statSync(from).isFile()) continue;
    copyFileSync(from, join(target, name));
    carried.push(name);
  }
  return carried;
}

/**
 * The screenshots the gate will accept being handed in: at least three of them (the
 * board, a detail view and a filtered view), and every name inside the dossier's
 * rules. Anything less stops the run, exit 1, rather than letting the dossier be
 * written over a set it would refuse.
 */
function requireUsableScreenshots(names: string[]): void {
  if (names.length < 3) {
    halt(`token radar: screenshots/ holds ${names.length} image${names.length === 1 ? '' : 's'}: hand in 3, the board, a detail view and a filtered view\n`, 1);
  }
  for (const name of names) {
    if (!SCREENSHOT_NAME.test(name)) {
      halt(`token radar: screenshots/${name}: a name is letters, digits and . _ -, 1 to 128 characters\n`, 1);
    }
  }
}

/** The two lines a finished run leaves on stdout: what was scored, and where it all went. */
function announceRun(out: string, shots: string[], counts: { protocols: number; watchlist: number; rows: number; early: number; live: number }): void {
  process.stdout.write(
    `token radar: ${counts.protocols} protocols, ${counts.watchlist} on the watchlist, ${counts.rows} rows scored (${counts.early} early, ${counts.live} live set aside)\n` +
      `token radar: wrote ${join(out, 'board.json')}, ${join(out, 'data.js')}, ${join(out, 'dashboard')} (3 files), ${join(out, 'screenshots')} (${shots.length} images) and ${join(out, 'dossier.json')}\n`,
  );
}

/**
 * The run itself, in the order the header lays out. One part of that ordering is
 * load-bearing rather than tidy: the dossier is written only once every other output
 * exists, and nothing is written after it, because it summarises the finished output
 * and the scorer compares its own rebuild of it byte for byte.
 */
function run(): void {
  const snapshotFile = locateSnapshot();
  const out = locateOutput();

  const snapshot = parseSnapshot(readFileSync(snapshotFile, 'utf8'));
  const { board, radar } = buildRadar(snapshot);
  const flaw = boardIssue(board, snapshot);
  if (flaw !== null) {
    halt(`token radar: the model wrote a board the gate refuses: ${flaw}\n`, 1);
  }

  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, 'board.json'), `${JSON.stringify({ rows: board })}\n`);
  writeFileSync(join(out, 'data.js'), dataScript(radar));

  mirrorTree(join(MODULE_DIR, 'dashboard'), join(out, 'dashboard'));
  const shots = mirrorTree(join(MODULE_DIR, 'screenshots'), join(out, 'screenshots'));
  requireUsableScreenshots(shots);

  writeFileSync(
    join(out, 'dossier.json'),
    buildDossier(out, { text_max_bytes: DOSSIER_TEXT_LIMIT, screenshots: SCREENSHOT_LIMITS, dashboard: DASHBOARD_LIMITS }),
  );

  announceRun(out, shots, {
    protocols: snapshot.protocols.length,
    watchlist: snapshot.watchlist.length,
    rows: board.length,
    early: radar.early_size,
    live: radar.live_size,
  });
}

run();
