import {defineConfig} from 'vitest/config';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';

const root = dirname(fileURLToPath(import.meta.url));
const cssStub = resolve(root, 'tests/stubs/cssModule.ts');

/**
 * Vite plugin: redirect any `*.module.css` import to a JS proxy stub so
 * renderer components can be imported in tests without a CSS pipeline. Doing
 * this in `resolveId` handles relative specifiers (e.g. `../viz.module.css`)
 * that a config-level alias regex does not reliably catch.
 */
function stubCssModules() {
  return {
    name: 'stub-css-modules',
    enforce: 'pre' as const,
    resolveId(id: string) {
      if (id.endsWith('.module.css')) return cssStub;
      return null;
    },
  };
}

export default defineConfig({
  plugins: [stubCssModules()],
  resolve: {
    alias: [{find: '@site', replacement: root}],
  },
  test: {
    // Pure-logic tests run in node; renderer smoke tests use static markup
    // (react-dom/server) which needs no DOM, so node env is sufficient.
    environment: 'node',
    include: ['tests/**/*.test.{ts,tsx,mts,mjs}'],
    passWithNoTests: false,
  },
});
