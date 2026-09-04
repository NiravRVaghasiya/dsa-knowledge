import {describe, it, expect} from 'vitest';
// The validation library is authored in ESM JS; vitest imports it directly.
import {
  extractHeadings,
  hasUnbalancedFences,
  extractMarkdownLinks,
  headingAnchors,
  loadDocs,
  buildIndex,
  VALID_DIFFICULTIES,
} from '../scripts/lib/docs.mjs';

describe('extractHeadings', () => {
  it('extracts heading levels and text', () => {
    const body = '# Title\n\nsome text\n\n## Section\n\n### Sub';
    const h = extractHeadings(body);
    expect(h).toEqual([
      {level: 1, text: 'Title'},
      {level: 2, text: 'Section'},
      {level: 3, text: 'Sub'},
    ]);
  });

  it('ignores headings inside code fences', () => {
    const body = '# Real\n\n```\n# not a heading\n```\n';
    const h = extractHeadings(body);
    expect(h).toEqual([{level: 1, text: 'Real'}]);
  });
});

describe('hasUnbalancedFences', () => {
  it('is false for balanced fences', () => {
    expect(hasUnbalancedFences('```\ncode\n```')).toBe(false);
  });
  it('is true for a dangling fence', () => {
    expect(hasUnbalancedFences('```\ncode')).toBe(true);
  });
});

describe('extractMarkdownLinks', () => {
  it('finds links and skips code fences and inline code', () => {
    const body = [
      '[a](/docs/x) and [b](#anchor)',
      '```',
      '[c](/docs/should-be-ignored)',
      '```',
      'inline `[d](/docs/also-ignored)` here',
    ].join('\n');
    const links = extractMarkdownLinks(body).map((l: {target: string}) => l.target);
    expect(links).toContain('/docs/x');
    expect(links).toContain('#anchor');
    expect(links).not.toContain('/docs/should-be-ignored');
    expect(links).not.toContain('/docs/also-ignored');
  });
});

describe('headingAnchors', () => {
  it('slugs h2–h6 the way Docusaurus does, including duplicates', () => {
    const body = [
      '# Intro',
      '## Key Takeaways for Practitioners',
      '## Details',
      '## Details',
    ].join('\n\n');
    const a = headingAnchors(body);
    expect(a.has('key-takeaways-for-practitioners')).toBe(true);
    expect(a.has('details')).toBe(true);
    expect(a.has('details-1')).toBe(true); // duplicate gets a suffix
  });

  it('excludes h1 anchors (Docusaurus assigns ids only to h2–h6)', () => {
    const a = headingAnchors('# Intro\n\n## Section');
    expect(a.has('intro')).toBe(false);
    expect(a.has('section')).toBe(true);
  });

  it('strips inline markdown before slugging', () => {
    const a = headingAnchors('## `code` and *emphasis*');
    expect(a.has('code-and-emphasis')).toBe(true);
  });

  it('every in-page anchor link in the repo resolves to a heading', () => {
    const docs = loadDocs();
    const broken: string[] = [];
    for (const d of docs) {
      const anchors = headingAnchors(d.body);
      for (const l of extractMarkdownLinks(d.body) as {target: string}[]) {
        if (l.target.startsWith('#')) {
          const id = l.target.slice(1);
          if (id && !anchors.has(id)) broken.push(`${d.relPath} -> ${l.target}`);
        }
      }
    }
    expect(broken, `broken anchors:\n${broken.join('\n')}`).toEqual([]);
  });
});

describe('real repository docs', () => {
  const docs = loadDocs();

  it('loads every doc with parseable frontmatter', () => {
    expect(docs.length).toBeGreaterThan(0);
    for (const d of docs) {
      expect(d.parseError, `${d.relPath} frontmatter should parse`).toBeNull();
    }
  });

  it('every guide has a valid difficulty', () => {
    for (const d of docs.filter((x: {isPractice: boolean}) => !x.isPractice)) {
      expect(
        VALID_DIFFICULTIES,
        `${d.relPath} difficulty`,
      ).toContain(d.frontMatter.difficulty);
    }
  });

  it('every prerequisite resolves to a real doc', () => {
    const {allSlugs} = buildIndex(docs);
    for (const d of docs) {
      const prereqs = d.frontMatter.prerequisites;
      if (!Array.isArray(prereqs)) continue;
      for (const p of prereqs) {
        const clean = String(p.to).replace(/\/$/, '');
        expect(allSlugs.has(clean), `${d.relPath} -> ${p.to}`).toBe(true);
      }
    }
  });

  it('every practice page has a matching guide', () => {
    const guideIds = new Set(
      docs.filter((x: {isPractice: boolean}) => !x.isPractice).map((x: {docId: string}) => x.docId),
    );
    for (const p of docs.filter((x: {isPractice: boolean}) => x.isPractice)) {
      const base = p.docId.replace(/-practice$/, '');
      expect(guideIds.has(base), `${p.relPath} needs guide ${base}`).toBe(true);
    }
  });
});
