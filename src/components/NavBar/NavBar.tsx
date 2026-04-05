import styles from './NavBar.module.css'

type Props = {
  theme: 'dark' | 'light'
  onToggleTheme: () => void
}

export default function NavBar({ theme, onToggleTheme }: Props) {
  return (
    <nav className={styles.nav}>
      <span className={styles.logo}>⬛ QuantumViz</span>
      <div className={styles.links}>
        <span className={styles.linkActive}>Bloch Sphere</span>
        <span className={styles.linkDisabled}>Circuits</span>
        <span className={styles.linkDisabled}>Algorithms</span>
      </div>
      <button
        className={styles.themeToggle}
        onClick={onToggleTheme}
        aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      >
        {theme === 'dark' ? '🌙' : '☀️'}
      </button>
    </nav>
  )
}
