/** Dynamic Sharp loader with WASM fallback; null when neither loads. See docs/image-backends.md. */

/* eslint-disable @typescript-eslint/no-var-requires */
import { createRequire } from 'node:module';

// A failed webpack external can remain cached as {}. Retrying that wrapper would
// falsely report success, and require.cache there is webpack's cache, not Node's.
const runtimeRequire = createRequire(__filename);

function requireSharp(): SharpType {
  const candidate: unknown = runtimeRequire('sharp');
  if (typeof candidate !== 'function') {
    throw new Error('Could not load the "sharp" module: export is not callable');
  }
  return candidate as SharpType;
}

export type SharpType = typeof import('sharp');

let sharpModule: SharpType | null = null;
let loadAttempted = false;
let loadError: string | null = null;

/** Returns the loaded Sharp module, or null if unavailable. */
export function getSharp(): SharpType | null {
  if (!loadAttempted) {
    loadSharp();
  }
  return sharpModule;
}

/** Human-readable reason why Sharp could not be loaded (null when loaded OK). */
export function getSharpError(): string | null {
  if (!loadAttempted) {
    loadSharp();
  }
  return loadError;
}

function loadSharp(): void {
  loadAttempted = true;

  // --- Attempt 1: normal load -------------------------------------------------
  try {
    sharpModule = requireSharp();
    return;
  } catch (e: any) {
    const msg: string = e?.message ?? '';
    const isUnsupportedCpu =
      msg.includes('Unsupported CPU') ||
      msg.includes('Could not load the "sharp" module');

    if (!isUnsupportedCpu) {
      // Unexpected error — don't retry.
      loadError = msg;
      console.error('[ImageCompare] Sharp failed to load:', msg);
      return;
    }

    console.warn(
      '[ImageCompare] Native Sharp unavailable (likely older CPU). ' +
        'Attempting WASM fallback…'
    );
  }

  // --- Attempt 2: force WASM by blocking native @img/sharp-* resolution ------
  try {
    // Purge the require cache so the retry re-runs Sharp's platform detection instead of returning the failed module.
    for (const key of Object.keys(runtimeRequire.cache)) {
      if (/[/\\](sharp|@img)[/\\]/.test(key)) {
        delete runtimeRequire.cache[key];
      }
    }

    const Module = runtimeRequire('module');
    const origResolve: Function = Module._resolveFilename;

    // Make native @img/sharp-* look absent, which is the only case Sharp's own fallback chain handles.
    Module._resolveFilename = function (request: string, ...args: any[]) {
      if (
        request.startsWith('@img/sharp-') &&
        !request.includes('wasm32')
      ) {
        const err: any = new Error(
          `[ImageCompare] Blocked native ${request} to force WASM fallback`
        );
        err.code = 'MODULE_NOT_FOUND';
        throw err;
      }
      return origResolve.call(this, request, ...args);
    };

    try {
      sharpModule = requireSharp();
    } finally {
      // Restore on every path: this is a process-global mutation (docs/image-backends.md: resolver-always-restored).
      Module._resolveFilename = origResolve;
    }

    console.log('[ImageCompare] Sharp loaded via WASM fallback.');
  } catch (e2: any) {
    sharpModule = null;
    loadError =
      'Sharp could not be loaded (native nor WASM). ' +
      'Image thumbnails will use a JS fallback. ' +
      `(${e2?.message ?? e2})`;
    console.error('[ImageCompare]', loadError);
  }
}
