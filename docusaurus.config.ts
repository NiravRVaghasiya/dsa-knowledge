import {themes as prismThemes} from 'prism-react-renderer';
import type {Config} from '@docusaurus/types';
import type * as Preset from '@docusaurus/preset-classic';

// NOTE: update `url` and `organizationName` if your GitHub username differs.
const GITHUB_USER = 'NiravRVaghasiya';
const REPO_NAME = 'dsa-knowledge';

const config: Config = {
  title: 'Algorithms for AI',
  tagline: 'DSA from first principles to the structures behind modern AI/ML/LLM systems',
  favicon: 'img/favicon.svg',

  url: `https://${GITHUB_USER}.github.io`,
  baseUrl: `/${REPO_NAME}/`,

  organizationName: GITHUB_USER,
  projectName: REPO_NAME,
  trailingSlash: false,

  onBrokenLinks: 'warn',
  onBrokenMarkdownLinks: 'warn',
  // Docusaurus only collects anchor ids from docs/MDX headings — it cannot see
  // anchors inside custom React pages. Our deep links into React pages
  // (/explorer#<conceptId> from the DSA→AI map, and /#learning-path from the
  // doc step chips) are verified correct at runtime (the explorer selects the
  // concept from window.location.hash; the homepage section has id
  // "learning-path"), but the static checker reports them as broken. Ignore
  // anchors rather than emit dozens of false-positive warnings on every build.
  onBrokenAnchors: 'ignore',

  i18n: {defaultLocale: 'en', locales: ['en']},

  // CRITICAL: render .md as CommonMark (not MDX) so O(n^2), <T>, {..} in
  // technical content don't break the build. .mdx still parses as MDX.
  markdown: {
    format: 'detect',
    mermaid: true,
  },
  presets: [
    [
      'classic',
      {
        docs: {
          routeBasePath: 'docs',
          sidebarPath: './sidebars.ts',
          editUrl: `https://github.com/${GITHUB_USER}/${REPO_NAME}/tree/main/`,
          showLastUpdateTime: true,
        },
        blog: false,
        theme: {customCss: './src/css/custom.css'},
      } satisfies Preset.Options,
    ],
  ],

  themeConfig: {
    image: 'img/social-card.png',
    colorMode: {defaultMode: 'dark', respectPrefersColorScheme: true},
    navbar: {
      title: 'Algorithms for AI',
      logo: {alt: 'Algorithms for AI', src: 'img/favicon.svg'},
      items: [
        {type: 'docSidebar', sidebarId: 'guidesSidebar', position: 'left', label: 'Guides'},
        {to: '/explorer', label: '🧭 Concept Explorer', position: 'left'},
        {to: '/dsa-ai-map', label: '🗺️ DSA → AI Map', position: 'left'},
        {to: '/learning-paths', label: '🎯 Paths', position: 'left'},
        {to: '/docs/tags', label: 'Tags', position: 'left'},
        {to: '/playground', label: '🐍 Playground', position: 'left'},
        {to: '/viz-demos', label: '🎬 Visualizations', position: 'left'},
        {
          href: `https://github.com/${GITHUB_USER}/${REPO_NAME}`,
          label: 'GitHub',
          position: 'right',
        },
      ],
    },
    footer: {
      style: 'dark',
      links: [
        {
          title: 'Sections',
          items: [
            {label: 'Foundation', to: '/docs/category/01-foundation'},
            {label: 'Core DSA', to: '/docs/category/02-core-dsa'},
            {label: 'Advanced DSA', to: '/docs/category/03-advanced-dsa'},
            {label: 'Domain-Specific DSA', to: '/docs/category/04-domain-specific-dsa'},
          ],
        },
        {
          title: 'Knowledge Graph',
          items: [
            {label: 'Concept Explorer', to: '/explorer'},
            {label: 'DSA → AI Map', to: '/dsa-ai-map'},
            {label: 'Learning Paths', to: '/learning-paths'},
          ],
        },
        {
          title: 'More',
          items: [
            {label: 'Browse by Tag', to: '/docs/tags'},
            {label: 'GitHub', href: `https://github.com/${GITHUB_USER}/${REPO_NAME}`},
          ],
        },
      ],
      copyright: `Algorithms for AI — 43 in-depth guides. Built with Docusaurus.`,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.dracula,
      additionalLanguages: ['python', 'java', 'bash', 'json'],
    },
  } satisfies Preset.ThemeConfig,

  themes: ['@docusaurus/theme-mermaid'],

  plugins: [
    [
      require.resolve('@easyops-cn/docusaurus-search-local'),
      {
        hashed: true,
        indexDocs: true,
        // Index the React pages too (Concept Explorer, DSA → AI Map, Learning
        // Paths, Playground, Visualizations) so the signature features are
        // discoverable from the site search box, not just the docs.
        indexPages: true,
        docsRouteBasePath: '/docs',
        highlightSearchTermsOnTargetPage: true,
        explicitSearchResultPath: true,
      },
    ],
  ],
};

export default config;
