import styles from './page.module.css';

export default function Home() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className="container">
          <h1>Traverse</h1>
          <p>Enterprise Travel Portal</p>
        </div>
      </header>

      <main className={styles.main}>
        <div className="container">
          <div className={styles.hero}>
            <h2>Seamless Travel Management</h2>
            <p>Manage requests, approvals, and expenses in one place.</p>
            <div className={styles.actions}>
              <button className={styles.btnPrimary}>Get Started</button>
              <button className={styles.btnSecondary}>Log In</button>
            </div>
          </div>
        </div>
      </main>

      <footer className={styles.footer}>
        <div className="container">
          <p>&copy; 2026 Traverse Inc.</p>
        </div>
      </footer>
    </div>
  );
}
