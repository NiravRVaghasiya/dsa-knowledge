#!/usr/bin/env node
// Internal link validation for the documentation.
//
// Checks, across all .md/.mdx docs:
//   - internal doc links ([text](/docs/...)) resolve to a real doc
//   - relative doc links ([text](./other) or [text](../x/other)) resolve
//   - anchor-only links (#section) are left alone (not verified against slugs)
//   - references to static assets (/img/..., /static/...) point at real files
//   - prerequisite `to` frontmatter targets resolve (also covered by
//     validate-content, kept here so link validation is self-contained)
//
// External links (http/https, mailto) are NOT treated as failures — many
// sites block automated requests, so failing on them would be noise.

import {existsSync} from 'node:fs';
import {join, dirname, resolve} from 'node:path';
import {
  loadDocs,
  buildIndex,
  extractMarkdownLinks,
  headingAnchors,
  STATIC_DIR,
} from './lib/docs.mjs';

const errors = [];
const warnings = [];
const skippedExternal = new Set();
let internalChecked = 0;
let anchorsChecked = 0;

function err(file, msg) {
  errors.push(`${file}: ${msg}`);
}

const docs = loadDocs();
const {allSlugs} = buildIndex(docs);

function isExternal(target) {
  return /^(https?:|mailto:|tel:)/i.test(target);
}

/** Resolve a /docs/... URL to see if it maps to a known doc. */
function resolveDocUrl(url) {
  const clean = url.replace(/[#?].*$/, '').replace(/\/$/, '') || '/';
  if (allSlugs.has(clean)) return true;
  // Also allow the base /docs and category index pages (generated).
  if (clean === '/docs' || clean.startsWith('/docs/category/')) return true;
  if (clean.startsWith('/docs/tags')) return true;
  // Non-doc site routes that exist as React pages (src/pages/*).
  if (
    clean === '/playground' ||
    clean === '/viz-demos' ||
    clean === '/explorer' ||
    clean === '/dsa-ai-map' ||
    clean === '/learning-paths' ||
    clean === '/' ||
    clean === ''
  )
    return true;
  return false;
}

/** Resolve a relative link from a source doc to a target doc file. */
function resolveRelative(sourceAbs, target) {
  const clean = target.replace(/[#?].*$/, '');
  if (!clean) return true; // pure anchor
  const base = dirname(sourceAbs);
  const candidate = resolve(base, clean);
  // Accept .md/.mdx with or without extension.
  const options = [
    candidate,
    candidate + '.md',
    candidate + '.mdx',
    join(candidate, 'index.md'),
    join(candidate, 'index.mdx'),
  ];
  return options.some((p) => existsSync(p));
}

/** Resolve a site-absolute asset reference (/img/... served from static/). */
function resolveAsset(target) {
  const clean = target.replace(/[#?].*$/, '');
  const rel = clean.replace(/^\//, '');
  return existsSync(join(STATIC_DIR, rel));
}

for (const doc of docs) {
  const f = doc.relPath;
  const anchors = headingAnchors(doc.body);

  // Links in the body.
  for (const {target, line} of extractMarkdownLinks(doc.body)) {
    if (!target) continue;

    // Same-page anchor link: verify it resolves to a heading on this page.
    // Reported as a WARNING (Docusaurus tolerates these with onBrokenLinks:warn
    // and some are intentional cross-page/React-page anchors).
    if (target.startsWith('#')) {
      anchorsChecked++;
      const anchor = target.slice(1);
      if (anchor && !anchors.has(anchor)) {
        warnings.push(`${f}: unresolved in-page anchor (line ${line}): ${target}`);
      }
      continue;
    }
    if (isExternal(target)) {
      skippedExternal.add(target);
      continue;
    }
    internalChecked++;

    if (target.startsWith('/docs')) {
      if (!resolveDocUrl(target)) {
        err(f, `broken doc link (line ${line}): ${target}`);
      }
    } else if (
      target.startsWith('/img') ||
      target.startsWith('/static') ||
      /\.(png|jpe?g|svg|gif|webp|pdf)$/i.test(target.replace(/[#?].*$/, ''))
    ) {
      if (target.startsWith('/') && !resolveAsset(target)) {
        err(f, `missing asset (line ${line}): ${target}`);
      } else if (!target.startsWith('/') && !resolveRelative(doc.absPath, target)) {
        err(f, `missing relative asset (line ${line}): ${target}`);
      }
    } else if (target.startsWith('/')) {
      // Other site-absolute route (e.g. /playground, /). Best-effort check.
      if (!resolveDocUrl(target)) {
        err(f, `broken site link (line ${line}): ${target}`);
      }
    } else {
      // Relative link to another doc.
      if (!resolveRelative(doc.absPath, target)) {
        err(f, `broken relative link (line ${line}): ${target}`);
      }
    }
  }

  // Prerequisite frontmatter targets.
  const prereqs = doc.frontMatter.prerequisites;
  if (Array.isArray(prereqs)) {
    for (const p of prereqs) {
      if (p && typeof p.to === 'string' && !resolveDocUrl(p.to)) {
        err(f, `prerequisite link does not resolve: ${p.to}`);
      }
    }
  }
}

console.log(`\nLink validation: ${docs.length} docs checked.`);
console.log(
  `  ${internalChecked} internal link(s) verified, ${anchorsChecked} in-page anchor(s) checked, ${skippedExternal.size} external target(s) skipped.`,
);
if (warnings.length) {
  console.log(`\n⚠ ${warnings.length} anchor warning(s):`);
  for (const w of warnings) console.log('  - ' + w);
}
if (errors.length) {
  console.error(`\n✖ ${errors.length} broken link(s):`);
  for (const e of errors) console.error('  - ' + e);
  console.error('\nLink validation FAILED.');
  process.exit(1);
}
console.log('\n✔ Link validation passed.');
