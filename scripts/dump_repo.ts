#!/usr/bin/env ts-node
/**
 * Dump repo contents into one file.
 * Respects .gitignore via `git ls-files` and ALSO filters by a custom .dumpignore.
 *
 * Usage:
 *   tsx scripts/dump_repo.ts -o repo_dump.txt --root . [--dumpignore .dumpignore]
 */

import { execFileSync } from 'child_process';
import * as fs from 'fs';
import * as fsp from 'fs/promises';
import * as path from 'path';
import ignore, { type Ignore } from 'ignore';

type Args = { output: string; root: string; dumpignore: string };

function parseArgs(argv: string[]): Args {
  const out: Args = {
    output: 'repo_dump.txt',
    root: '.',
    dumpignore: '.dumpignore',
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if ((a === '-o' || a === '--output') && i + 1 < argv.length)
      out.output = argv[++i];
    else if (a === '--root' && i + 1 < argv.length) out.root = argv[++i];
    else if (a === '--dumpignore' && i + 1 < argv.length)
      out.dumpignore = argv[++i];
    else throw new Error(`Unknown arg: ${a}`);
  }
  return out;
}

function gitLsFiles(repoRoot: string): string[] {
  const buf = execFileSync(
    'git',
    [
      '-C',
      repoRoot,
      'ls-files',
      '--cached',
      '--others',
      '--exclude-standard',
      '-z',
    ],
    { stdio: ['ignore', 'pipe', 'pipe'] },
  );
  const raw = buf.toString('utf8');
  return raw ? raw.split('\x00').filter(Boolean) : [];
}

async function loadDumpIgnore(
  repoRoot: string,
  dumpignoreRel: string,
): Promise<Ignore> {
  const ig = ignore();
  const p = path.isAbsolute(dumpignoreRel)
    ? dumpignoreRel
    : path.join(repoRoot, dumpignoreRel);
  try {
    const txt = await fsp.readFile(p, 'utf8');
    // Normalize line endings. Paths from git are POSIX with forward slashes.
    ig.add(txt.split(/\r?\n/).join('\n'));
  } catch {
    // No .dumpignore present is fine
  }
  return ig;
}

async function isProbablyBinary(p: string): Promise<boolean> {
  try {
    const fd = await fsp.open(p, 'r');
    try {
      const buf = Buffer.alloc(8192);
      const { bytesRead } = await fd.read(buf, 0, buf.length, 0);
      const slice = buf.subarray(0, bytesRead);
      return slice.includes(0);
    } finally {
      await fd.close();
    }
  } catch {
    return false;
  }
}

async function main() {
  const { output, root, dumpignore } = parseArgs(process.argv);
  const repoRoot = path.resolve(root);
  const outPath = path.resolve(output);

  if (!fs.existsSync(repoRoot)) {
    console.error(`Error: repo root does not exist: ${repoRoot}`);
    process.exit(2);
  }

  const relPaths = gitLsFiles(repoRoot);

  // Build .dumpignore matcher
  const ig = await loadDumpIgnore(repoRoot, dumpignore);

  // Exclude output file if inside repo
  let relOut: string | null = null;
  const outRelative = path.relative(repoRoot, outPath);
  if (!outRelative.startsWith('..') && !path.isAbsolute(outRelative)) {
    relOut = outRelative.split(path.sep).join('/');
  }

  // Filter list:
  // - keep only regular files
  // - drop output file
  // - drop any that match .dumpignore (git-style patterns)
  const files: string[] = [];
  for (const rel of relPaths) {
    if (!rel) continue;
    if (relOut && rel === relOut) continue;
    if (ig.ignores(rel)) continue;
    const abs = path.join(repoRoot, rel);
    try {
      const st = fs.statSync(abs);
      if (st.isFile()) files.push(rel);
    } catch {
      /* skip unreadable */
    }
  }

  await fsp.mkdir(path.dirname(outPath), { recursive: true });
  const header =
    `# Repository dump\n# Root: ${repoRoot}\n# Generated: ${new Date().toISOString()}\n` +
    `# Dupignore: ${dumpignore}\n\n`;
  await fsp.writeFile(outPath, header, 'utf8');

  let count = 0;
  for (const rel of files) {
    const abs = path.join(repoRoot, rel);
    const lines: string[] = [];
    lines.push(`# FILE: ${rel}`);
    lines.push('```');
    try {
      if (await isProbablyBinary(abs)) {
        lines.push(`[binary file omitted: ${rel}]`);
      } else {
        let data: string;
        try {
          data = await fsp.readFile(abs, 'utf8');
        } catch {
          const raw = await fsp.readFile(abs);
          data = raw.toString('latin1');
        }
        // Ensure file block ends with newline to keep fence alignment
        lines.push(data.endsWith('\n') ? data.slice(0, -1) : data);
      }
    } catch (e: any) {
      lines.push(`[error reading file: ${e?.message ?? e}]`);
    }
    lines.push('```', '');
    await fsp.appendFile(outPath, lines.join('\n'), 'utf8');
    count++;
  }

  console.log(`Wrote ${count} files to ${outPath}`);
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : String(e));
  process.exit(1);
});
