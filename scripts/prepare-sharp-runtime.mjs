// npm skips cpu=wasm32 optional packages on desktop platforms. Ship it explicitly
// so a locally built VSIX also works in SSH/containers and on older CPUs.
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
import { readFileSync, mkdirSync, mkdtempSync, rmSync, existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);
const version = require('sharp/package.json').version;
const destination = join(root, 'node_modules', '@img', 'sharp-wasm32');
const manifest = join(destination, 'package.json');
require.resolve('@emnapi/runtime');
require.resolve('tslib');
if (existsSync(manifest) && JSON.parse(readFileSync(manifest, 'utf8')).version === version &&
    existsSync(join(destination, 'lib', 'sharp-wasm32.node.wasm'))) {
  console.log(`Sharp WASM ${version} is ready`);
} else {
  const staging = mkdtempSync(join(tmpdir(), 'imagecompare-wasm-'));
  try {
    if (!process.env.npm_execpath) throw new Error('Run through npm run prepare:runtime');
    const result = JSON.parse(execFileSync(process.execPath, [process.env.npm_execpath,
      'pack', `@img/sharp-wasm32@${version}`, '--json', '--pack-destination', staging], { encoding: 'utf8' }));
    mkdirSync(destination, { recursive: true });
    execFileSync('tar', ['-xzf', join(staging, result[0].filename), '-C', destination, '--strip-components=1']);
    console.log(`Installed Sharp WASM ${version} for cross-platform packaging`);
  } finally {
    rmSync(staging, { recursive: true, force: true });
  }
}
