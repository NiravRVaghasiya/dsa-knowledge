import type {ReactNode} from 'react';
import clsx from 'clsx';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import Layout from '@theme/Layout';
import Mermaid from '@theme/Mermaid';

type Section = {
  emoji: string;
  title: string;
  desc: string;
  count: number;
  to: string;
};

const SECTIONS: Section[] = [
  {emoji: '🧱', title: 'Foundation', count: 6, to: '/docs/category/01-foundation',
   desc: 'Complexity analysis, primitive data structures, and how Python stores them.'},
  {emoji: '⚙️', title: 'Core DSA', count: 9, to: '/docs/category/02-core-dsa',
   desc: 'The bread-and-butter patterns behind most interview questions and production code.'},
  {emoji: '🚀', title: 'Advanced DSA', count: 14, to: '/docs/category/03-advanced-dsa',
   desc: 'Higher-order techniques for optimization, graphs, and range queries.'},
  {emoji: '🤖', title: 'Domain-Specific DSA', count: 14, to: '/docs/category/04-domain-specific-dsa',
   desc: 'Where classical DSA meets AI/ML/LLM systems — vector search, tokenization, attention, agents.'},
];

const LEARNING_PATH = `graph LR
  A["🧱 Foundation"] --> B["⚙️ Core DSA"]
  B --> C["🚀 Advanced DSA"]
  C --> D["🤖 Domain-Specific DSA"]
  A -.-> |"Big-O, Arrays, Hashing"| B
  B -.-> |"Trees, Graphs, Heaps"| C
  C -.-> |"DP, Shortest Path"| D
  classDef s fill:#1e3a8a,stroke:#60a5fa,color:#fff,rx:8,ry:8;
  class A,B,C,D s;`;

function Hero() {
  const {siteConfig} = useDocusaurusContext();
  return (
    <header className="heroBanner">
      <div className="container">
        <h1 className="heroTitle">{siteConfig.title}</h1>
        <p className="heroSubtitle">{siteConfig.tagline}</p>
        <div className="heroButtons">
          <Link className="button button--primary button--lg" to="/docs/big-o-complexity">
            Start Learning →
          </Link>
          <Link className="button button--secondary button--lg" to="/explorer">
            🧭 Explore the Concept Graph
          </Link>
        </div>
        <div className="heroStats">
          <div className="heroStat"><div className="heroStatNum">43</div><div className="heroStatLabel">Guides</div></div>
          <div className="heroStat"><div className="heroStatNum">4</div><div className="heroStatLabel">Sections</div></div>
          <div className="heroStat"><div className="heroStatNum">AI/ML</div><div className="heroStatLabel">Focused</div></div>
        </div>
      </div>
    </header>
  );
}

function Sections() {
  return (
    <section className="container">
      <div className="sectionGrid">
        {SECTIONS.map((s) => (
          <Link key={s.title} to={s.to} className="sectionCard" style={{textDecoration: 'none', color: 'inherit'}}>
            <div className="sectionEmoji">{s.emoji}</div>
            <div className="sectionCardTitle">{s.title}</div>
            <div className="sectionCardDesc">{s.desc}</div>
            <div className="sectionCardCount">{s.count} guides →</div>
          </Link>
        ))}
      </div>
    </section>
  );
}

function SignatureFeature() {
  const cards = [
    {emoji: '🧭', title: 'Concept Explorer', to: '/explorer',
     desc: 'Pick any concept and walk an interactive knowledge graph: prerequisites, where it appears in AI systems, and what to learn next.'},
    {emoji: '🗺️', title: 'DSA → AI Map', to: '/dsa-ai-map',
     desc: 'A searchable table mapping each classical data structure and algorithm to the modern AI systems built on top of it.'},
    {emoji: '🎯', title: 'Learning Paths', to: '/learning-paths',
     desc: 'Four curated routes — from DSA fundamentals to LLM systems engineering — with local progress tracking.'},
  ];
  return (
    <section className="container" style={{marginTop: '2.5rem', marginBottom: '1rem'}}>
      <div style={{textAlign: 'center', maxWidth: 760, margin: '0 auto 1.5rem'}}>
        <h2 style={{marginBottom: '0.5rem'}}>The signature idea: learn a DSA concept, see where it powers AI</h2>
        <p style={{fontSize: '1.05rem', opacity: 0.85}}>
          This isn&apos;t just a collection of articles. It&apos;s an interactive knowledge system that connects
          classical data structures and algorithms to the AI/ML/LLM systems that depend on them.
        </p>
      </div>
      <div className="sectionGrid">
        {cards.map((c) => (
          <Link key={c.title} to={c.to} className="sectionCard" style={{textDecoration: 'none', color: 'inherit'}}>
            <div className="sectionEmoji">{c.emoji}</div>
            <div className="sectionCardTitle">{c.title}</div>
            <div className="sectionCardDesc">{c.desc}</div>
            <div className="sectionCardCount">Open →</div>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout title="Home" description={siteConfig.tagline}>
      <Hero />
      <main>
        <SignatureFeature />
        <Sections />
        <section id="learning-path" className="container" style={{marginBottom: '4rem'}}>
          <h2 id="learning-path-heading" style={{textAlign: 'center', marginBottom: '1.5rem'}}>🛤️ Learning Path</h2>
          <Mermaid value={LEARNING_PATH} />
        </section>
      </main>
    </Layout>
  );
}
