import { readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

/** Absolute path of the repository root. */
export const root = resolve(dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Reads a repository file as UTF-8 text. */
export function read(relativePath) {
  return readFileSync(join(root, relativePath), 'utf8');
}

/** Reads and parses a repository JSON file. */
export function readJson(relativePath) {
  return JSON.parse(read(relativePath));
}
