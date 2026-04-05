// src/components/GateControls/GateControls.tsx
import React, { useState, useCallback, useEffect } from 'react'
import type { GateType } from '../../lib/quantum'
import type { HistoryEntry } from '../../App'
import styles from './GateControls.module.css'

type RotationGate = 'Rx' | 'Ry' | 'Rz'
const ROTATION_GATES: RotationGate[] = ['Rx', 'Ry', 'Rz']
const isRotation = (g: GateType): g is RotationGate => ROTATION_GATES.includes(g as RotationGate)

type Props = {
  history: HistoryEntry[]
  onApplyGate: (gate: GateType, angle?: number) => void
  onUndo: () => void
  onReset: () => void
}

const ALL_GATES: GateType[] = ['H', 'X', 'Y', 'Z', 'S', 'T', 'Rx', 'Ry', 'Rz']

export default function GateControls({ history, onApplyGate, onUndo, onReset }: Props) {
  const [openGate, setOpenGate] = useState<RotationGate | null>(null)
  const [angle, setAngle] = useState(Math.PI / 2)

  // Close angle panel on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpenGate(null)
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [])

  const handleGateClick = useCallback((gate: GateType) => {
    if (isRotation(gate)) {
      setOpenGate(prev => {
        if (prev !== gate) setAngle(Math.PI / 2)  // reset only when opening a new gate
        return prev === gate ? null : gate
      })
    } else {
      setOpenGate(null)
      onApplyGate(gate)
    }
  }, [onApplyGate])

  const handleApply = useCallback(() => {
    if (!openGate) return
    const clamped = Math.max(-2 * Math.PI, Math.min(2 * Math.PI, angle))
    onApplyGate(openGate, clamped)
    setOpenGate(null)
  }, [openGate, angle, onApplyGate])

  const chipLabel = (entry: HistoryEntry) =>
    isRotation(entry.gate) ? `${entry.gate}(${entry.angle!.toFixed(2)})` : entry.gate

  return (
    <div className={styles.container}>
      {/* Gate buttons + Undo/Reset */}
      <div className={styles.gateRow}>
        {ALL_GATES.map(gate => (
          <button
            key={gate}
            className={styles.gateBtn}
            onClick={() => handleGateClick(gate)}
          >
            {gate}
          </button>
        ))}
        <div className={styles.controls}>
          <button className={styles.undoBtn} onClick={onUndo} disabled={history.length === 0}>
            ↩ Undo
          </button>
          <button className={styles.resetBtn} onClick={onReset}>
            Reset
          </button>
        </div>
      </div>

      {/* Angle input panel (Rx/Ry/Rz) */}
      {openGate && (
        <div className={styles.anglePanel}>
          <span className={styles.angleLabel}>{openGate}(θ):</span>
          <input
            className={styles.angleSlider}
            type="range"
            min={-2 * Math.PI}
            max={2 * Math.PI}
            step={0.01}
            value={angle}
            onChange={e => setAngle(Number(e.target.value))}
          />
          <input
            className={styles.angleNumber}
            type="number"
            min={-2 * Math.PI}
            max={2 * Math.PI}
            step={0.01}
            value={angle}
            onChange={e => setAngle(Number(e.target.value))}
          />
          <button className={styles.applyBtn} onClick={handleApply}>Apply</button>
          <button
            className={styles.cancelBtn}
            onClick={() => setOpenGate(null)}
            title="Cancel (Esc)"
          >✕</button>
        </div>
      )}

      {/* History chips */}
      <div className={styles.historyRow}>
        <span className={`${styles.chip} ${styles.chipStart}`}>|0⟩</span>
        {history.map((entry, i) => (
          <React.Fragment key={i}>
            <span className={styles.arrow}>→</span>
            <span className={styles.chip}>{chipLabel(entry)}</span>
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}
