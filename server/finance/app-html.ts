import fs from 'node:fs';
import path from 'node:path';

/**
 * The Finance page's HTML.
 *
 * Production (esbuild bundle, `--loader:.html=text`): the dynamic import below is bundled, so the
 * page is inlined into dist/index.js as a string and no file has to ship next to it.
 * Development (`tsx server/index-dev.ts`): Node cannot import .html, so the import throws and the
 * file is read from disk instead — re-read on each request, so edits show without a restart.
 */
let bundled: string | null | undefined;

export async function loadAppHtml(): Promise<string> {
  if (bundled === undefined) {
    try {
      bundled = (await import('./app.html')).default;
    } catch {
      bundled = null;
    }
  }
  if (bundled) return bundled;
  return fs.promises.readFile(path.join(import.meta.dirname, 'app.html'), 'utf8');
}
