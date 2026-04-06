// src/components/TensorComponents/TensorComponents.tsx
import { useEffect, useRef, useState } from 'react'
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
  const sparseEntries = [...entries]
    .filter(e => e.probSquared > 0)
    .sort((a, b) => b.probSquared - a.probSquared)

  // Columns/rows: power-of-2 layout — 2^ceil(n/2) across, 2^floor(n/2) down
  const cols = Math.pow(2, Math.ceil(numQubits / 2))
  const rows = Math.pow(2, Math.floor(numQubits / 2))

  // Measure actual cell size for dynamic label font
  const gridOuterRef = useRef<HTMLDivElement>(null)
  const [cellPx, setCellPx] = useState(40)

  useEffect(() => {
    const el = gridOuterRef.current
    if (!el) return
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect
      const cellW = width / cols
      const cellH = height / rows
      setCellPx(Math.min(cellW, cellH))
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [cols, rows])

  const labelFontSize = Math.max(8, Math.min(18, cellPx * 0.32))
  const showLabel = cellPx >= 18

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
          <div className={styles.gridOuter} ref={gridOuterRef}>
            <div
              className={styles.grid}
              style={{
                gridTemplateColumns: `repeat(${cols}, 1fr)`,
                gridTemplateRows: `repeat(${rows}, 1fr)`,
                aspectRatio: `${cols} / ${rows}`,
              }}
            >
              {entries.map(e => (
                <div
                  key={e.index}
                  className={styles.cell}
                  style={{
                    background: magnitudeToBg(e.magnitude),
                    border: `3px solid ${phaseToBorder(e.phase)}`,
                  }}
                  title={`${e.basis}  |α|=${e.magnitude.toFixed(3)}  P=${(e.probSquared*100).toFixed(1)}%`}
                >
                  {showLabel && (
                    <span className={styles.cellLabel} style={{ fontSize: labelFontSize }}>
                      {e.basis}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
          <div className={styles.legend}>
            <span>Magnitude: dark=0, bright=1</span>
            <span>Border: phase (0°=red · 180°=cyan)</span>
          </div>
        </>
      )}

      {view === 'sparse' && (
        <div className={styles.sparseScroll}>
          <div className={styles.sparseHeader}>
            {sparseEntries.length} of {entries.length} states
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
        </div>
      )}
    </div>
  )
}
