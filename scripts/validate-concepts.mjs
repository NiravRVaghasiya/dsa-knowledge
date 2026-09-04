#!/usr/bin/env node
// CI validation for the DSA → AI concept graph (src/data/concepts.ts).
//
// This script has filesystem access, so it does what the pure in-repo
// validator (src/data/graph.ts, unit-tested) cannot: confirm every concept
// `slug` resolves to a real docs guide. It ALSO re-checks the structural
// invariants (nonexistent refs, invalid relation types, prerequisite cycles,
// broken path steps) independently, so CI fails even if a test is removed.
//
// Because concepts.ts is TypeScript, we parse it structurally with regex rather
// than importing it — extracting ids, edges, slugs, relation types, and paths.

import {readFileSync, existsSync} from 'node:fs';
import {join, dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {loadDocs, buildIndex} from './lib/docs.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = resolve(__dirname, '..');
const CONCEPTS_FILE = join(REPO_ROOT, 'src', 'data', 'concepts.ts');
const TYPES_FILE = join(REPO_ROOT, 'src', 'data', 'conceptTypes.ts');

const errors = [];
const err = (m) => errors.push(m);

const source = readFileSync(CONCEPTS_FILE, 'utf8');
const typesSource = readFileSync(TYPES_FILE, 'utf8');

// --- Extract the allowed relation types from conceptTypes.ts ---
/** Strip `// ...` line comments so apostrophes in comments (e.g. "A's cost")
 * don't corrupt single-quoted-string extraction. */
function stripLineComments(s) {
  return s.replace(/\/\/[^\n]*/g, '');
}

// Match up to the explicit `] as const` terminator so comments containing
// brackets can't truncate the capture.
const relBlock = typesSource.match(/RELATION_TYPES\s*=\s*\[([\s\S]*?)\]\s*as const/);
const relationTypes = new Set(
  (relBlock ? stripLineComments(relBlock[1]).match(/'([^']+)'/g) ?? [] : []).map((s) => s.replace(/'/g, '')),
);
if (relationTypes.size === 0) err('could not parse RELATION_TYPES from conceptTypes.ts');

const acyclicBlock = typesSource.match(/ACYCLIC_RELATIONS[^=]*=\s*\[([^\]]*)\]/);
const acyclic = (acyclicBlock ? acyclicBlock[1].match(/'([^']+)'/g) ?? [] : []).map((s) => s.replace(/'/g, ''));

// --- Parse concepts: split on top-level `id:` occurrences within the concepts array. ---
// A concept object looks like: { id: 'x', title: '...', ..., edges: [ {to:'y', type:'prerequisite'}, ... ] }
const conceptsArrayMatch = source.match(/concepts:\s*\[([\s\S]*?)\n\s*\],\s*\n\s*paths:/);
if (!conceptsArrayMatch) {
  err('could not locate the concepts array in concepts.ts');
}
const conceptsText = stripLineComments(conceptsArrayMatch ? conceptsArrayMatch[1] : '');

// Each concept starts with `id:` — capture id, kind, slug, and its edges block.
const concepts = [];
const idRe = /\bid:\s*'([^']+)'/g;
let m;
const idPositions = [];
while ((m = idRe.exec(conceptsText)) !== null) {
  idPositions.push({id: m[1], index: m.index});
}
for (let i = 0; i < idPositions.length; i++) {
  const start = idPositions[i].index;
  const end = i + 1 < idPositions.length ? idPositions[i + 1].index : conceptsText.length;
  const block = conceptsText.slice(start, end);
  const id = idPositions[i].id;
  const slug = (block.match(/\bslug:\s*'([^']+)'/) ?? [])[1];
  // edges: capture every {to:'...', type:'...'} pair in this block
  const edges = [];
  const edgeRe = /\{\s*to:\s*'([^']+)'\s*,\s*type:\s*'([^']+)'/g;
  let em;
  while ((em = edgeRe.exec(block)) !== null) {
    edges.push({to: em[1], type: em[2]});
  }
  concepts.push({id, slug, edges});
}

if (concepts.length === 0) err('parsed zero concepts — check concepts.ts formatting');

// --- Parse learning paths ---
const pathsMatch = source.match(/paths:\s*\[([\s\S]*)\]\s*,?\s*\n?\s*\};?\s*$/);
const pathsText = pathsMatch ? pathsMatch[1] : '';
const paths = [];
const pathIdRe = /\bid:\s*'([^']+)'/g;
const pathIds = [];
while ((m = pathIdRe.exec(pathsText)) !== null) pathIds.push({id: m[1], index: m.index});
for (let i = 0; i < pathIds.length; i++) {
  const start = pathIds[i].index;
  const end = i + 1 < pathIds.length ? pathIds[i + 1].index : pathsText.length;
  const block = pathsText.slice(start, end);
  const stepsMatch = block.match(/steps:\s*\[([\s\S]*?)\]/);
  const steps = stepsMatch ? (stepsMatch[1].match(/'([^']+)'/g) ?? []).map((s) => s.replace(/'/g, '')) : [];
  paths.push({id: pathIds[i].id, steps});
}

// ---------------- Structural validation ----------------
const idSet = new Set(concepts.map((c) => c.id));

// duplicate ids
const seen = new Set();
for (const c of concepts) {
  if (seen.has(c.id)) err(`duplicate concept id "${c.id}"`);
  seen.add(c.id);
  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(c.id)) err(`concept id "${c.id}" is not kebab-case`);
}

// edges: valid type + existing target + no self-edge
for (const c of concepts) {
  for (const e of c.edges) {
    if (!relationTypes.has(e.type)) err(`concept "${c.id}" has invalid relation type "${e.type}"`);
    if (!idSet.has(e.to)) err(`concept "${c.id}" edges to nonexistent concept "${e.to}"`);
    if (e.to === c.id) err(`concept "${c.id}" has a self-edge (${e.type})`);
  }
}

// prerequisite (acyclic) cycle detection
for (const rel of acyclic) {
  const adj = new Map(concepts.map((c) => [c.id, c.edges.filter((e) => e.type === rel && idSet.has(e.to)).map((e) => e.to)]));
  const color = new Map([...idSet].map((id) => [id, 0])); // 0 white 1 gray 2 black
  const stack = [];
  let cycle = null;
  const dfs = (u) => {
    color.set(u, 1);
    stack.push(u);
    for (const v of adj.get(u) ?? []) {
      if (color.get(v) === 1) {
        cycle = stack.slice(stack.indexOf(v)).concat(v);
        return true;
      }
      if (color.get(v) === 0 && dfs(v)) return true;
    }
    color.set(u, 2);
    stack.pop();
    return false;
  };
  for (const id of idSet) {
    if (color.get(id) === 0 && dfs(id)) break;
  }
  if (cycle) err(`cycle detected in "${rel}" edges: ${cycle.join(' -> ')}`);
}

// learning paths reference real concepts
for (const p of paths) {
  if (p.steps.length < 2) err(`learning path "${p.id}" must have at least 2 steps`);
  for (const s of p.steps) if (!idSet.has(s)) err(`learning path "${p.id}" references nonexistent concept "${s}"`);
}

// ---------------- Slug → guide resolution (the filesystem-only check) ----------------
const docs = loadDocs();
const {allSlugs} = buildIndex(docs);
for (const c of concepts) {
  if (!c.slug) continue;
  const clean = ('/docs' + c.slug.replace(/^\/docs/, '')).replace(/\/+/g, '/').replace(/\/$/, '');
  const routed = c.slug.startsWith('/docs') ? c.slug : '/docs' + c.slug;
  if (!allSlugs.has(routed.replace(/\/$/, '')) && !allSlugs.has(clean)) {
    err(`concept "${c.id}" slug "${c.slug}" does not resolve to a real guide`);
  }
}

// ---------------- Report ----------------
console.log(`\nConcept-graph validation: ${concepts.length} concepts, ${paths.length} learning paths.`);
if (errors.length) {
  console.error(`\n\u2716 ${errors.length} error(s):`);
  for (const e of errors) console.error('  - ' + e);
  console.error('\nConcept-graph validation FAILED.');
  process.exit(1);
}
console.log('\u2714 Concept-graph validation passed.');
