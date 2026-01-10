import styles from './page.module.css';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';

export default function Home() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.navContainer}>
          <Link href="/" className={styles.logo}>Travyntra</Link>
          <nav className={styles.nav}>
            <Link href="/login" className={styles.navLink}>Login</Link>
            <Link href="/register" className={styles.ctaPrimary} style={{ padding: '4px 12px', fontSize: '12px' }}>Get Started</Link>
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className="container">
            <h1 className={styles.headline}>Travel, Simplified.</h1>
            <p className={styles.subheadline}>
              The enterprise platform designed for scale.
            </p>
            <div className={styles.ctaContainer}>
              <Link href="/register" className={styles.ctaPrimary}>Start your journey</Link>
              <Link href="/login" className={styles.ctaLink}>
                Log in <ChevronRight size={16} />
              </Link>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className={styles.features}>
          <div className={styles.grid}>
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Scale effortlessly.</h3>
              <p className={styles.cardText}>Managing thousands of trips is as easy as managing one.</p>
            </div>
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>One Platform.</h3>
              <p className={styles.cardText}>Connect everyone. Employees, agents, and policies.</p>
            </div>
            <div className={styles.card}>
              <h3 className={styles.cardTitle}>Intelligent.</h3>
              <p className={styles.cardText}>Data-driven insights to optimize your spend.</p>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className={styles.footerContainer}>
          <p>Copyright © 2026 Travyntra Inc. All rights reserved.</p>
          <p>Privacy Policy | Terms of Use</p>
        </div>
      </footer>
    </div>
  );
}
