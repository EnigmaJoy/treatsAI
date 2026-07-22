#!/usr/bin/env node
// Validates that every m.key() call in source files has a corresponding entry
// in all locale JSON files. Run with: npm run check:i18n

import { readFileSync, readdirSync } from 'fs';
import { join, resolve } from 'path';
import { globSync } from 'fs';

const ROOT = resolve(import.meta.dirname, '..');
const MESSAGES_DIR = join(ROOT, 'messages');
const SRC_DIR = join(ROOT, 'src');

// Keys that look like message calls but are actually object property accesses.
// Add to this list if a false positive appears.
const IGNORE_KEYS = new Set(['active', 'id', 'label']);

// --- 1. Collect all keys from every locale file ---
const localeFiles = readdirSync(MESSAGES_DIR).filter(f => f.endsWith('.json'));
const locales = {};
for (const file of localeFiles) {
    const locale = file.replace('.json', '');
    const data = JSON.parse(readFileSync(join(MESSAGES_DIR, file), 'utf8'));
    locales[locale] = new Set(Object.keys(data).filter(k => k !== '$schema'));
}

// --- 2. Find the source-of-truth locale (en) ---
const sourceLocale = 'en';
const sourceKeys = locales[sourceLocale];
if (!sourceKeys) {
    console.error(`Missing source locale: ${sourceLocale}.json`);
    process.exit(1);
}

// --- 3. Check all locale files have the same keys as en ---
let missingInLocales = false;
for (const [locale, keys] of Object.entries(locales)) {
    if (locale === sourceLocale) continue;
    for (const key of sourceKeys) {
        if (!keys.has(key)) {
            console.error(`[i18n] Missing in ${locale}.json: "${key}"`);
            missingInLocales = true;
        }
    }
    for (const key of keys) {
        if (!sourceKeys.has(key)) {
            console.warn(`[i18n] Extra key in ${locale}.json (not in en): "${key}"`);
        }
    }
}

// --- 4. Scan source files for m.key() usage ---
function collectSourceFiles(dir, results = []) {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
        const full = join(dir, entry.name);
        if (entry.isDirectory() && entry.name !== 'node_modules' && entry.name !== '.svelte-kit') {
            collectSourceFiles(full, results);
        } else if (entry.isFile() && (entry.name.endsWith('.svelte') || entry.name.endsWith('.ts') || entry.name.endsWith('.js'))) {
            // Skip generated paraglide files
            if (full.includes('paraglide')) continue;
            results.push(full);
        }
    }
    return results;
}

const sourceFiles = collectSourceFiles(SRC_DIR);
const usedKeys = new Map(); // key -> [file, ...]

for (const file of sourceFiles) {
    const content = readFileSync(file, 'utf8');
    const matches = content.matchAll(/\bm\.([a-zA-Z_][a-zA-Z0-9_]*)\s*\(/g);
    for (const [, key] of matches) {
        if (IGNORE_KEYS.has(key)) continue;
        if (!usedKeys.has(key)) usedKeys.set(key, []);
        usedKeys.get(key).push(file.replace(ROOT, '').replace(/\\/g, '/'));
    }
}

// --- 5. Report keys used in code but missing from en.json ---
let missingInSource = false;
for (const [key, files] of [...usedKeys.entries()].sort()) {
    if (!sourceKeys.has(key)) {
        console.error(`[i18n] Used in code but missing from en.json: "${key}"`);
        console.error(`       Used in: ${[...new Set(files)].join(', ')}`);
        missingInSource = true;
    }
}

// --- 6. Summary ---
if (!missingInLocales && !missingInSource) {
    console.log(`[i18n] OK - all ${sourceKeys.size} keys present in ${localeFiles.length} locales, ${usedKeys.size} used in code.`);
    process.exit(0);
} else {
    process.exit(1);
}
