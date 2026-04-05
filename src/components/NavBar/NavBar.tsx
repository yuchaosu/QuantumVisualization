import styles from './NavBar.module.css'

export default function NavBar() {
  return (
    <nav className={styles.nav}>
      <span className={styles.logo}>⬛ QuantumViz</span>
      <div className={styles.links}>
        <span className={styles.linkActive}>Bloch Sphere</span>
        <span className={styles.linkDisabled}>Circuits</span>
        <span className={styles.linkDisabled}>Algorithms</span>
      </div>
    </nav>
  )
}
