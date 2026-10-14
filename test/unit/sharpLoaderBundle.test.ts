import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import webpack from 'webpack';
import { mkdtempSync, rmSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

// Source-only tests miss webpack's failed-external cache. Exercise the production
// bundler and real WASM JPEG encoding in a fresh Node process without native Sharp.
const output = mkdtempSync(path.resolve('node_modules/.imagecompare-loader-'));
afterAll(() => rmSync(output, { recursive: true, force: true }));
beforeAll(async () => {
  await new Promise<void>((resolve, reject) => {
    webpack({
      mode: 'production', target: 'node', entry: path.resolve('src/sharpLoader.ts'),
      output: { path: output, filename: 'loader.cjs', libraryTarget: 'commonjs2' },
      externals: { sharp: 'commonjs sharp' },
      resolve: { extensions: ['.ts', '.js'] },
      module: { rules: [{ test: /\.ts$/, loader: 'ts-loader', options: { transpileOnly: true } }] },
    }, (error, stats) => {
      if (error || stats?.hasErrors()) reject(error || new Error(stats?.toString()));
      else resolve();
    });
  });
}, 30000);

describe('bundled Sharp loader', () => {
  for (const missingWasm of [false, true]) {
    it(missingWasm ? 'returns null when native and WASM are absent' : 'encodes a JPEG after native failure using real WASM', () => {
      const child = spawnSync(process.execPath, ['-e', `
        const assert = require('node:assert/strict');
        const Module = require('node:module');
        const load = Module._load;
        const resolve = Module._resolveFilename;
        let attempts = 0;
        Module._load = function(id, ...args) {
          if (id === 'sharp' && ++attempts === 1) throw new Error('Unsupported CPU');
          if (id.startsWith('@img/sharp-') && (${missingWasm} || !id.includes('wasm32'))) {
            const error = new Error('Simulated missing native runtime');
            error.code = 'MODULE_NOT_FOUND'; throw error;
          }
          return load.call(this, id, ...args);
        };
        (async () => {
          const loader = require(${JSON.stringify(path.join(output, 'loader.cjs'))});
          const sharp = loader.getSharp();
          assert.equal(attempts, 2, 'retry must reach Node, not a cached webpack export');
          assert.equal(Module._resolveFilename, resolve);
          if (${missingWasm}) {
            assert.equal(sharp, null);
            assert.match(loader.getSharpError(), /native nor WASM/);
          } else {
            assert.equal(typeof sharp, 'function');
            const png = await sharp({ create: { width: 80, height: 40, channels: 3, background: '#a02020' } }).png().toBuffer();
            const jpeg = await sharp(png).resize(20, 20, { fit: 'inside' }).jpeg({ quality: 70 }).toBuffer();
            const meta = await sharp(jpeg).metadata();
            assert.equal(meta.format, 'jpeg'); assert.equal(meta.width, 20); assert.equal(meta.height, 10);
          }
        })().catch(e => { console.error(e); process.exitCode = 1; });
      `], { encoding: 'utf8', timeout: 20000 });
      expect(child.error).toBeUndefined();
      expect(child.status, child.stdout + child.stderr).toBe(0);
    }, 25000);
  }
});
