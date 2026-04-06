// src/components/NavBar/NavBar.tsx
import styles from './NavBar.module.css'

type Props = {
  theme: 'dark' | 'light'
  onToggleTheme: () => void
  page: 'bloch' | 'circuits' | 'algorithms'
  onNavigate: (page: 'bloch' | 'circuits' | 'algorithms') => void
}

export default function NavBar({ theme, onToggleTheme, page, onNavigate }: Props) {
  return (
    <nav className={styles.nav}>
      <span className={styles.logo}>⬛ QuantumViz</span>
      <div className={styles.links}>
        <span
          className={page === 'bloch' ? styles.linkActive : styles.link}
          onClick={() => onNavigate('bloch')}
        >Bloch Sphere</span>
        <span
          className={page === 'circuits' ? styles.linkActive : styles.link}
          onClick={() => onNavigate('circuits')}
        >Circuits</span>
        <span
          className={page === 'algorithms' ? styles.linkActive : styles.link}
          onClick={() => onNavigate('algorithms')}
        >Algorithms</span>
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
