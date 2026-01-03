/**
 * @license
 * Copyright 2025 OneAgent Team
 * SPDX-License-Identifier: Apache-2.0
 * 
 * This script builds the oneagent-bridge.js bundle from oneagent-bridge.ts
 * Usage: node scripts/build-oneagent-bridge.js
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { writeFileSync, mkdirSync, existsSync } from 'node:fs';

let esbuild;
try {
    esbuild = (await import('esbuild')).default;
} catch (_error) {
    console.warn('esbuild not available, skipping bundle step');
    process.exit(0);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);
const pkg = require(path.resolve(__dirname, '../package.json'));

const external = [
    '@lydell/node-pty',
    'node-pty',
    '@lydell/node-pty-darwin-arm64',
    '@lydell/node-pty-darwin-x64',
    '@lydell/node-pty-linux-x64',
    '@lydell/node-pty-win32-arm64',
    '@lydell/node-pty-win32-x64',
    'tiktoken',
];

// Ensure dist directory exists
const distDir = path.resolve(__dirname, '../dist');
if (!existsSync(distDir)) {
    mkdirSync(distDir, { recursive: true });
}

esbuild
    .build({
        entryPoints: ['packages/cli/src/oneagent-bridge.ts'],
        bundle: true,
        outfile: 'dist/oneagent-bridge.js',
        platform: 'node',
        format: 'esm',
        target: 'node20',
        external,
        packages: 'bundle',
        inject: [path.resolve(__dirname, 'esbuild-shims.js')],
        banner: {
            js: `// Force strict mode and setup for ESM
"use strict";`,
        },
        alias: {
            'is-in-ci': path.resolve(
                __dirname,
                '../packages/cli/src/patches/is-in-ci.ts',
            ),
        },
        define: {
            'process.env.CLI_VERSION': JSON.stringify(pkg.version),
            // Make global available for compatibility
            global: 'globalThis',
        },
        loader: { '.node': 'file' },
        metafile: true,
        write: true,
        keepNames: true,
    })
    .then(({ metafile }) => {
        console.log('✅ oneagent-bridge.js built successfully');
        if (process.env.DEV === 'true') {
            writeFileSync('./dist/oneagent-bridge.esbuild.json', JSON.stringify(metafile, null, 2));
        }
    })
    .catch((error) => {
        console.error('esbuild build failed:', error);
        process.exitCode = 1;
    });
