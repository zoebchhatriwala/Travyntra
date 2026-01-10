import styles from './page.module.css';
import Link from 'next/link';

export default function Home() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className="container flex items-center justify-between">
          <div className={styles.logo}>Travyntra</div>
          <nav className={styles.nav}>
            <Link href="/login" className={styles.navLink}>Login</Link>
            <Link href="/register" className={`${styles.navLink} ${styles.cta}`}>Get Started</Link>
          </nav>
        </div>
      </header>

      <main className={styles.main}>
        {/* Hero Section */}
        <section className={styles.hero}>
          <div className="container">
            <h1 className={styles.headline}>Travel, Simplified at Scale</h1>
            <p className={styles.subheadline}>
              A unified platform to manage journeys, streamline operations, and deliver seamless travel experiences — no matter the scale.
            </p>
            <div className={styles.heroActions}>
              <Link href="/register" className={`${styles.btnPrimary} ${styles.heroBtnPrimary}`}>Start Now</Link>
              <Link href="/login" className={`${styles.btnSecondary} ${styles.heroBtnSecondary}`}>Log In</Link>
            </div>
          </div>
        </section>

        {/* About Section */}
        <section className={styles.about}>
          <div className="container">
            <div className={styles.grid}>
              <div className={styles.card}>
                <h3>Built for scale.</h3>
                <p>Designed for simplicity. Managing thousands of trips is as easy as managing one.</p>
              </div>
              <div className={styles.card}>
                <h3>One platform.</h3>
                <p>Endless journeys. Connect your employees, agents, and policies in one place.</p>
              </div>
              <div className={styles.card}>
                <h3>Smart infrastructure.</h3>
                <p>For modern enterprises. Data-driven insights and automated approvals.</p>
              </div>
            </div>

            <div className={styles.longform}>
              <p>
                At Travyntra, we believe travel should be effortless, even at scale. Our platform is built to support growing enterprises, travel agencies, and corporate clients with powerful tools that centralize workflows, improve visibility, and enhance control. With a focus on reliability, scalability, and simplicity, Travyntra transforms complex travel processes into smooth, connected experiences.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className={styles.footer}>
        <div className="container">
          <p className={styles.footerTag}>Powering travel operations worldwide.</p>
          <p className={styles.copy}>&copy; 2026 Travyntra Inc.</p>
        </div>
      </footer>
    </div>
  );
}
