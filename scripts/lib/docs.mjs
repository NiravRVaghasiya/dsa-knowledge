// Shared utilities for the content/link validation scripts.
// Builds an in-memory registry of every documentation file so the validators
// never hard-code filenames or slugs.

import {readFileSync, readdirSync, statSync, existsSync} from 'node:fs';
import {join, relative, extname, dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import matter from 'gray-matter';
import GithubSlugger from 'github-slugger';

const __dirname = dirname(fileURLToPath(import.meta.url));
export const REPO_ROOT = resolve(__dirname, '..', '..');
export const DOCS_DIR = join(REPO_ROOT, 'docs');
export const STATIC_DIR = join(REPO_ROOT, 'static');

export const VALID_DIFFICULTIES = ['beginner', 'intermediate', 'advanced'];

/** Recursively collect files under `dir` matching one of `exts`. */
export function walk(dir, exts = ['.md', '.mdx']) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      out.push(...walk(full, exts));
    } else if (exts.includes(extname(full))) {
      out.push(full);
    }
  }
  return out;
}

/**
 * Load every doc into a normalized record:
 *   { absPath, relPath, ext, isPractice, frontMatter, body, slug, docId }
 *
 * - slug: the routed URL path (from frontmatter `slug`, else derived).
 * - docId: the Docusaurus doc id (section-relative path without extension),
 *   e.g. "foundation/arrays-and-strings" — used in pagination_prev/next.
 */
export function loadDocs() {
  const files = walk(DOCS_DIR);
  return files.map((absPath) => {
    const relPath = relative(REPO_ROOT, absPath).replace(/\\/g, '/');
    const ext = extname(absPath);
    const raw = readFileSync(absPath, 'utf8');
    let frontMatter = {};
    let body = raw;
    let parseError = null;
    try {
      const parsed = matter(raw);
      frontMatter = parsed.data ?? {};
      body = parsed.content ?? '';
    } catch (e) {
      parseError = e instanceof Error ? e.message : String(e);
    }

    const isPractice = /-practice\.(md|mdx)$/.test(absPath);

    // Derive the routed slug.
    const fileSlug = relPath
      .replace(/^docs\//, '')
      .replace(/\.(md|mdx)$/, '');
    const slug =
      typeof frontMatter.slug === 'string' && frontMatter.slug.length > 0
        ? frontMatter.slug
        : '/' + fileSlug;

    // Docusaurus doc id: strip the numeric section prefix folder segment
    // (e.g. "01-foundation") down to its label after the number.
    const docId = fileSlug
      .replace(/(^|\/)\d+-/g, '$1');

    return {
      absPath,
      relPath,
      ext,
      isPractice,
      frontMatter,
      body,
      slug,
      docId,
      parseError,
    };
  });
}

/**
 * Build lookup indexes over the docs:
 *   bySlug:  routed slug -> doc            (e.g. "/big-o-complexity")
 *   byDocId: doc id      -> doc            (e.g. "foundation/arrays-and-strings")
 *   allSlugs: Set of every resolvable /docs/... URL path
 */
export function buildIndex(docs) {
  const bySlug = new Map();
  const byDocId = new Map();
  const allSlugs = new Set();

  for (const doc of docs) {
    bySlug.set(doc.slug, doc);
    byDocId.set(doc.docId, doc);
    // Docusaurus serves docs under /docs<slug> when slug starts with '/'.
    allSlugs.add(('/docs' + doc.slug).replace(/\/+/g, '/'));
    allSlugs.add(('/docs/' + doc.docId).replace(/\/+/g, '/'));
  }
  return {bySlug, byDocId, allSlugs};
}

/**
 * Strip the inline markdown formatting Docusaurus removes before generating a
 * heading id (emphasis, inline code, link syntax — keeping link text).
 */
function stripInlineMarkdown(text) {
  return text
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1') // [text](url) -> text
    .replace(/`([^`]*)`/g, '$1') // `code` -> code
    .replace(/[*_~]/g, '') // emphasis markers
    .trim();
}

/**
 * Set of anchor ids available on a doc page, computed with the SAME slugger
 * Docusaurus uses (github-slugger), so results match the real heading ids
 * (including the -1/-2 suffixes it adds for duplicates).
 */
export function headingAnchors(body) {
  const slugger = new GithubSlugger();
  const anchors = new Set();
  for (const h of extractHeadings(body)) {
    // Docusaurus only assigns anchor ids to h2–h6. The single page-title h1
    // (and any other h1 used as a body section heading) gets no id, so links
    // targeting those anchors are broken on the rendered site.
    if (h.level < 2) continue;
    const clean = stripInlineMarkdown(h.text);
    const slug = slugger.slug(clean);
    if (slug) anchors.add(slug);
  }
  return anchors;
}

/** Extract headings (level + text) from markdown body. */
export function extractHeadings(body) {
  const headings = [];
  const lines = body.split('\n');
  let inFence = false;
  for (const line of lines) {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;
    const m = /^(#{1,6})\s+(.*)$/.exec(line);
    if (m) headings.push({level: m[1].length, text: m[2].trim()});
  }
  return headings;
}

/**
 * Detect unbalanced (malformed) code fences in a markdown body.
 * Returns true when the number of fence markers is odd.
 */
export function hasUnbalancedFences(body) {
  const fences = body.match(/^[ \t]*(```|~~~)/gm) ?? [];
  return fences.length % 2 !== 0;
}

/** Find all markdown links [text](target) in a body, skipping code fences. */
export function extractMarkdownLinks(body) {
  const links = [];
  const lines = body.split('\n');
  let inFence = false;
  lines.forEach((line, i) => {
    if (/^\s*(```|~~~)/.test(line)) {
      inFence = !inFence;
      return;
    }
    if (inFence) return;
    // Strip inline code spans so we don't match links inside `code`.
    const cleaned = line.replace(/`[^`]*`/g, '');
    const re = /\[[^\]]*\]\(([^)]+)\)/g;
    let match;
    while ((match = re.exec(cleaned)) !== null) {
      links.push({target: match[1].trim(), line: i + 1});
    }
  });
  return links;
}

export {existsSync, join, relative, resolve};
