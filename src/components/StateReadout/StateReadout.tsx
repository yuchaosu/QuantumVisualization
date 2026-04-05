// src/components/StateReadout/StateReadout.tsx
import type { Complex } from '../../lib/quantum'
import styles from './StateReadout.module.css'

type Props = {
  alpha: Complex
  beta: Complex
  theta: number
  phi: number
}

function fmt(n: number): string {
  return n.toFixed(2)
}

function fmtComplex(c: Complex): string {
  const sign = c.im >= 0 ? '+' : '−'
  return `${fmt(c.re)} ${sign} ${fmt(Math.abs(c.im))}i`
}

export default function StateReadout({ alpha, beta, theta, phi }: Props) {
  const magAlpha = Math.sqrt(alpha.re ** 2 + alpha.im ** 2)
  const magBeta  = Math.sqrt(beta.re ** 2 + beta.im ** 2)
  const probZero = magAlpha * magAlpha
  const probOne  = magBeta  * magBeta

  return (
    <div className={styles.container}>
      {/* Column 1: State Vector */}
      <div className={styles.cell}>
        <div className={styles.cellLabel}>State Vector</div>
        <div className={styles.cellValue}>|ψ⟩ = α|0⟩ + β|1⟩</div>
      </div>

      {/* Column 2: Angles */}
      <div className={styles.cell}>
        <div className={styles.cellLabel}>Angles</div>
        <div className={`${styles.cellValue} ${styles.angleValue}`}>
          θ = {fmt(theta)} rad<br />
          φ = {fmt(phi)} rad
        </div>
      </div>

      {/* Column 3: Amplitudes */}
      <div className={styles.cell}>
        <div className={styles.cellLabel}>Amplitudes</div>
        <div className={styles.cellValue}>
          α = {fmtComplex(alpha)}<br />
          β = {fmtComplex(beta)}
        </div>
      </div>

      {/* Column 4: Probabilities */}
      <div className={styles.cell}>
        <div className={styles.cellLabel}>Probabilities</div>
        <div className={styles.probRow}>
          <div className={styles.probEntry}>
            <span className={styles.probLabel}>P(|0⟩) = {(probZero * 100).toFixed(0)}%</span>
            <div className={`${styles.probBar} ${styles.probBarZero}`}
              style={{ width: `${probZero * 100}%` }} />
          </div>
          <div className={styles.probEntry}>
            <span className={styles.probLabel}>P(|1⟩) = {(probOne * 100).toFixed(0)}%</span>
            <div className={`${styles.probBar} ${styles.probBarOne}`}
              style={{ width: `${probOne * 100}%` }} />
          </div>
        </div>
      </div>
    </div>
  )
}
