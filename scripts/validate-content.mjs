#!/usr/bin/env node
// Content / metadata validation for the documentation.
//
// Verifies (per the doc's role — guide vs practice):
//   - frontmatter parses (malformed YAML is reported)
//   - required frontmatter fields exist
//   - `difficulty` is one of the allowed values
//   - `tags` is a non-empty list of strings
//   - `prerequisites` entries reference real docs
//   - `pagination_prev` / `pagination_next` reference real docs (or null)
//   - every guide has a matching `-practice` page and vice-versa
//   - AlgoViz frame blocks are structurally valid
//   - code fences are balanced (warning)
//   - a complexity section exists in guides (warning)
//
// Exit code is non-zero when any ERROR is found. WARNINGs never fail the build.

import {
  loadDocs,
  buildIndex,
  extractHeadings,
  hasUnbalancedFences,
  VALID_DIFFICULTIES,
} from './lib/docs.mjs';
import {validateFrames} from './lib/validateFramesNode.mjs';

const errors = [];
const warnings = [];

function err(file, msg) {
  errors.push(`${file}: ${msg}`);
}
function warn(file, msg) {
  warnings.push(`${file}: ${msg}`);
}

const docs = loadDocs();
const {byDocId, bySlug} = buildIndex(docs);

// Resolve a pagination target (a doc id) or prerequisite `to` (a /docs/ URL).
function docIdExists(id) {
  return byDocId.has(id);
}
function slugUrlExists(url) {
  // Accept /docs/<slug> and /docs/<docId> forms, with or without trailing slash.
  const clean = url.replace(/[#?].*$/, '').replace(/\/$/, '');
  const withoutDocs = clean.replace(/^\/docs/, '');
  return (
    bySlug.has(withoutDocs) ||
    byDocId.has(withoutDocs.replace(/^\//, '')) ||
    [...bySlug.values()].some((d) => ('/docs' + d.slug) === clean) ||
    [...byDocId.values()].some((d) => ('/docs/' + d.docId) === clean)
  );
}

for (const doc of docs) {
  const f = doc.relPath;
  const fm = doc.frontMatter;

  if (doc.parseError) {
    err(f, `malformed frontmatter — ${doc.parseError}`);
    continue;
  }

  // --- Required fields for all docs ---
  if (!fm.title || typeof fm.title !== 'string') {
    err(f, 'missing required frontmatter field: title');
  }
  if (!fm.description || typeof fm.description !== 'string') {
    // Practice pages sometimes lean on the guide; still require a description
    // so search results and social cards are meaningful.
    warn(f, 'missing frontmatter field: description');
  }

  // --- Guide-specific checks ---
  if (!doc.isPractice) {
    if (!fm.difficulty) {
      err(f, 'missing required frontmatter field: difficulty');
    } else if (!VALID_DIFFICULTIES.includes(fm.difficulty)) {
      err(
        f,
        `invalid difficulty "${fm.difficulty}" (expected one of ${VALID_DIFFICULTIES.join(', ')})`,
      );
    }

    if (fm.tags !== undefined) {
      if (!Array.isArray(fm.tags) || fm.tags.length === 0) {
        err(f, 'tags must be a non-empty list');
      } else if (!fm.tags.every((t) => typeof t === 'string' && t.length > 0)) {
        err(f, 'tags must be a list of non-empty strings');
      }
    } else {
      warn(f, 'missing frontmatter field: tags');
    }

    // Prerequisites reference real docs.
    if (fm.prerequisites !== undefined) {
      if (!Array.isArray(fm.prerequisites)) {
        err(f, 'prerequisites must be a list');
      } else {
        for (const p of fm.prerequisites) {
          if (!p || typeof p.to !== 'string' || typeof p.title !== 'string') {
            err(f, 'each prerequisite must have a title and a `to` link');
            continue;
          }
          if (!slugUrlExists(p.to)) {
            err(f, `prerequisite links to a non-existent doc: ${p.to}`);
          }
        }
      }
    }

    // Complexity section (soft requirement).
    const headings = extractHeadings(doc.body);
    const hasComplexity = headings.some((h) =>
      /complexity/i.test(h.text),
    );
    if (!hasComplexity) {
      warn(f, 'no "Complexity" section heading found');
    }
  }

  // --- Pagination references (both guides and practice) ---
  for (const key of ['pagination_prev', 'pagination_next']) {
    const val = fm[key];
    if (val === undefined || val === null) continue;
    if (typeof val !== 'string') {
      err(f, `${key} must be a doc id string or null`);
      continue;
    }
    if (!docIdExists(val)) {
      err(f, `${key} references a non-existent doc id: ${val}`);
    }
  }

  // --- Code fences balanced ---
  if (hasUnbalancedFences(doc.body)) {
    err(f, 'unbalanced code fences (``` markers do not pair up)');
  }

  // --- AlgoViz frames structurally valid ---
  // Only *literal* frame arrays can be validated statically. A `frames={...}`
  // whose value is a computed expression (e.g. an imported builder call like
  // `frames={buildFrames(x)}`) is valid MDX/JSX but not JSON — skip it, since
  // its correctness is covered by the builder's unit tests instead.
  for (const {block, line} of extractAlgoVizFrames(doc.body)) {
    const trimmed = block.trimStart();
    if (!trimmed.startsWith('[')) continue; // computed expression, not a literal
    let parsed;
    try {
      parsed = JSON.parse(block);
    } catch (e) {
      err(f, `AlgoViz frames near line ${line} are not valid JSON: ${e.message}`);
      continue;
    }
    const result = validateFrames(parsed);
    if (!result.valid) {
      for (const e of result.errors) {
        err(f, `AlgoViz frames near line ${line}: ${e}`);
      }
    }
  }
}

// --- Guide <-> practice consistency ---
const guides = docs.filter((d) => !d.isPractice);
const practices = docs.filter((d) => d.isPractice);
const practiceBaseIds = new Set(
  practices.map((d) => d.docId.replace(/-practice$/, '')),
);
const guideIds = new Set(guides.map((d) => d.docId));

for (const g of guides) {
  if (!practiceBaseIds.has(g.docId)) {
    warn(g.relPath, 'guide has no matching -practice page');
  }
}
for (const p of practices) {
  const base = p.docId.replace(/-practice$/, '');
  if (!guideIds.has(base)) {
    err(p.relPath, `practice page has no matching guide (expected doc id "${base}")`);
  }
}

/**
 * Extract the JS expression passed to `frames={...}` in <AlgoViz> blocks.
 * The value is a JSX expression container whose inner expression is a JSON
 * array literal (that is how the content authors it). Returns [{block, line}]
 * where `block` is the inner array text ready for JSON.parse.
 */
function extractAlgoVizFrames(body) {
  const results = [];
  const marker = /frames=\{/g;
  let m;
  while ((m = marker.exec(body)) !== null) {
    // `frames={` — the last char is the opening brace of the JSX container.
    const braceStart = m.index + m[0].length - 1;
    let depth = 0;
    let i = braceStart;
    let inString = false;
    let quote = '';
    for (; i < body.length; i++) {
      const c = body[i];
      if (inString) {
        if (c === '\\') {
          i++; // skip escaped char
        } else if (c === quote) {
          inString = false;
        }
        continue;
      }
      if (c === '"' || c === "'" || c === '`') {
        inString = true;
        quote = c;
        continue;
      }
      if (c === '{') depth++;
      else if (c === '}') {
        depth--;
        if (depth === 0) {
          i++;
          break;
        }
      }
    }
    // Strip the outer JSX container braces to get the inner array expression.
    const inner = body.slice(braceStart + 1, i - 1).trim();
    const line = body.slice(0, m.index).split('\n').length;
    results.push({block: inner, line});
  }
  return results;
}

// --- Report ---
console.log(`\nContent validation: ${docs.length} docs checked.`);
if (warnings.length) {
  console.log(`\n⚠ ${warnings.length} warning(s):`);
  for (const w of warnings) console.log('  - ' + w);
}
if (errors.length) {
  console.error(`\n✖ ${errors.length} error(s):`);
  for (const e of errors) console.error('  - ' + e);
  console.error('\nContent validation FAILED.');
  process.exit(1);
}
console.log('\n✔ Content validation passed.');
