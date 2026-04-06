// src/components/TensorComponents/TensorComponents.tsx
import type { AmplitudeEntry } from '../../lib/tensorNetwork'
import styles from './TensorComponents.module.css'

type Props = {
  entries: AmplitudeEntry[]
  numQubits: number
  view: 'heatmap' | 'sparse'
  onToggleView: () => void
}

function magnitudeToBg(mag: number): string {
  return `hsl(${240 - mag * 200}, 80%, 40%)`
}

function phaseToBorder(phase: number): string {
  const hue = ((phase + Math.PI) / (2 * Math.PI)) * 360
  return `hsl(${hue}, 100%, 50%)`
}

function fmtComplex(e: AmplitudeEntry): string {
  const re = (e.magnitude * Math.cos(e.phase)).toFixed(3)
  const imVal = e.magnitude * Math.sin(e.phase)
  const sign  = imVal >= 0 ? '+' : '−'
  return `${re} ${sign} ${Math.abs(imVal).toFixed(3)}i`
}

export default function TensorComponents({ entries, numQubits, view, onToggleView }: Props) {
  const cellSize = numQubits <= 4 ? 40 : numQubits <= 6 ? 24 : 8
  const showLabel = numQubits <= 6 && cellSize >= 24

  const sparseEntries = [...entries]
    .filter(e => e.probSquared > 0.001)
    .sort((a, b) => b.probSquared - a.probSquared)

  const cols = Math.min(entries.length, numQubits <= 3 ? entries.length : 16)

  return (
    <div className={styles.container}>
      <div className={styles.toggle}>
        <button
          className={`${styles.btn} ${view === 'heatmap' ? styles.btnActive : ''}`}
          onClick={() => view !== 'heatmap' && onToggleView()}
        >Heatmap</button>
        <button
          className={`${styles.btn} ${view === 'sparse' ? styles.btnActive : ''}`}
          onClick={() => view !== 'sparse' && onToggleView()}
        >Sparse</button>
      </div>

      {view === 'heatmap' && (
        <>
          <div
            className={styles.grid}
            style={{ gridTemplateColumns: `repeat(${cols}, ${cellSize}px)` }}
          >
            {entries.map(e => (
              <div
                key={e.index}
                className={styles.cell}
                style={{
                  width: cellSize, height: cellSize,
                  background: magnitudeToBg(e.magnitude),
                  border: `2px solid ${phaseToBorder(e.phase)}`,
                }}
                title={`${e.basis}  |α|=${e.magnitude.toFixed(3)}  P=${(e.probSquared*100).toFixed(1)}%`}
              >
                {showLabel && <span className={styles.cellLabel}>{e.basis}</span>}
              </div>
            ))}
          </div>
          <div className={styles.legend}>
            <span>Magnitude: dark=0, bright=1</span>
            <span>Border: phase (0°=red · 180°=cyan)</span>
          </div>
        </>
      )}

      {view === 'sparse' && (
        <>
          <div className={styles.sparseHeader}>
            Showing {sparseEntries.length} of {entries.length} (threshold 0.1%)
          </div>
          {sparseEntries.map(e => (
            <div key={e.index} className={styles.sparseRow}>
              <span className={styles.sparseBasis}>{e.basis}</span>
              <div className={styles.sparseBarOuter}>
                <div
                  className={styles.sparseBarFill}
                  style={{ width: `${e.probSquared * 100}%` }}
                />
              </div>
              <span className={styles.sparseVal}>{fmtComplex(e)}</span>
              <span className={styles.sparsePhase}>{(e.phase*180/Math.PI).toFixed(0)}°</span>
            </div>
          ))}
        </>
      )}
    </div>
  )
}
