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
  {emoji: '🚀', title: 'Advanced DSA', count: 8, to: '/docs/category/03-advanced-dsa',
   desc: 'Higher-order techniques for optimization, graphs, and range queries.'},
  {emoji: '🤖', title: 'Domain-Specific DSA', count: 8, to: '/docs/category/04-domain-specific-dsa',
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
          <Link className="button button--secondary button--lg" to="/docs/tags">
            Browse by Tag
          </Link>
        </div>
        <div className="heroStats">
          <div className="heroStat"><div className="heroStatNum">31</div><div className="heroStatLabel">Guides</div></div>
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

export default function Home(): ReactNode {
  const {siteConfig} = useDocusaurusContext();
  return (
    <Layout title="Home" description={siteConfig.tagline}>
      <Hero />
      <main>
        <Sections />
        <section id="learning-path" className="container" style={{marginBottom: '4rem'}}>
          <h2 style={{textAlign: 'center', marginBottom: '1.5rem'}}>🛤️ Learning Path</h2>
          <Mermaid value={LEARNING_PATH} />
        </section>
      </main>
    </Layout>
  );
}
