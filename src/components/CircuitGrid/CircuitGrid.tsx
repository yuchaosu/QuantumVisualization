// src/components/CircuitGrid/CircuitGrid.tsx
import type { CircuitGate } from '../../lib/tensorNetwork'
import styles from './CircuitGrid.module.css'

type Props = {
  gates: CircuitGate[]
  numQubits: number
  contractionStep: number
  inputMode: 'drag' | 'builder' | 'code'
  onDrop: (qubit: number, step: number, gateType: string) => void
  onCellClick: (qubit: number, step: number) => void
  onRemoveGate: (id: string) => void
}

const ROW_H = 40
const COL_W = 52
const MARGIN_L = 36
const PAD_Y = 16
const GATE_W = 40
const GATE_H = 32

const GATE_COLOR: Record<string, string> = {
  H: 'var(--accent-blue)',
  X: 'var(--accent-red)',   Y: 'var(--accent-purple)', Z: 'var(--accent-green)',
  S: 'var(--text-secondary)', T: 'var(--text-secondary)',
  Rx: 'var(--accent-blue)', Ry: 'var(--accent-blue)', Rz: 'var(--accent-blue)',
}

function getMaxStep(gates: CircuitGate[]): number {
  return gates.length === 0 ? 2 : Math.max(...gates.map(g => g.step))
}

export default function CircuitGrid({
  gates, numQubits, contractionStep, inputMode, onDrop, onCellClick, onRemoveGate
}: Props) {
  const maxStep = Math.max(getMaxStep(gates) + 1, 3)
  const svgW = MARGIN_L + (maxStep + 1) * COL_W
  const svgH = PAD_Y * 2 + numQubits * ROW_H

  // Map "step-qubit" to gate for quick lookup of occupied cells
  const cellMap = new Map<string, CircuitGate>()
  for (const g of gates) {
    const qs = g.type === 'single' ? [g.qubit]
      : g.type === 'cnot' ? [g.control, g.target]
      : [g.qubit0, g.qubit1]
    for (const q of qs) cellMap.set(`${g.step}-${q}`, g)
  }

  const cx = (step: number) => MARGIN_L + step * COL_W + COL_W / 2
  const cy = (qubit: number) => PAD_Y + qubit * ROW_H + ROW_H / 2

  const handleDragOver = (e: React.DragEvent) => e.preventDefault()
  const handleDrop = (e: React.DragEvent, qubit: number, step: number) => {
    e.preventDefault()
    const gateType = e.dataTransfer.getData('gateType')
    if (gateType) onDrop(qubit, step, gateType)
  }

  return (
    <div className={styles.container}>
      <svg width={svgW} height={svgH} className={styles.svg}>
        {/* Qubit wire lines */}
        {Array.from({ length: numQubits }, (_, q) => (
          <line key={q} x1={MARGIN_L} y1={cy(q)} x2={svgW - COL_W / 2} y2={cy(q)}
            stroke="var(--border)" strokeWidth={1} />
        ))}

        {/* Qubit labels */}
        {Array.from({ length: numQubits }, (_, q) => (
          <text key={q} x={MARGIN_L - 8} y={cy(q) + 4} textAnchor="end"
            fill="var(--accent-blue)" fontSize={12} fontFamily="var(--font-mono)">q{q}</text>
        ))}

        {/* Drop/click zones for empty cells (drag and builder modes) */}
        {inputMode !== 'code' && Array.from({ length: maxStep + 1 }, (_, step) =>
          Array.from({ length: numQubits }, (_, qubit) => {
            if (cellMap.has(`${step}-${qubit}`)) return null
            return (
              <rect
                key={`zone-${step}-${qubit}`}
                x={cx(step) - GATE_W / 2} y={cy(qubit) - GATE_H / 2}
                width={GATE_W} height={GATE_H} rx={4}
                fill="transparent"
                stroke={inputMode === 'drag' ? 'var(--border)' : 'transparent'}
                strokeDasharray={inputMode === 'drag' ? '4 3' : undefined}
                style={{ cursor: inputMode === 'drag' ? 'copy' : 'pointer' }}
                onDragOver={handleDragOver}
                onDrop={e => handleDrop(e, qubit, step)}
                onClick={() => inputMode === 'builder' && onCellClick(qubit, step)}
                className={styles.dropZone}
              />
            )
          })
        )}

        {/* Rendered gates */}
        {gates.map((gate, gIdx) => {
          const contracted = gIdx < contractionStep
          const isNext     = gIdx === contractionStep
          const opacity    = contracted ? 0.4 : 1

          if (gate.type === 'single') {
            const color = GATE_COLOR[gate.gate] ?? 'var(--text-secondary)'
            const x = cx(gate.step), y = cy(gate.qubit)
            return (
              <g key={gate.id} opacity={opacity} style={{ cursor:'pointer' }}
                onClick={() => onRemoveGate(gate.id)}>
                {isNext && <rect x={x-GATE_W/2-3} y={y-GATE_H/2-3}
                  width={GATE_W+6} height={GATE_H+6} rx={6}
                  fill="none" stroke="var(--accent-blue)" strokeWidth={2} />}
                <rect x={x-GATE_W/2} y={y-GATE_H/2} width={GATE_W} height={GATE_H} rx={4} fill={color} />
                <text x={x} y={y+4} textAnchor="middle" fill="#000" fontSize={11} fontFamily="var(--font-mono)">
                  {gate.gate}{gate.angle !== undefined ? `(${gate.angle.toFixed(1)})` : ''}
                </text>
              </g>
            )
          }

          if (gate.type === 'cnot') {
            const x = cx(gate.step)
            const cy0 = cy(gate.control), cy1 = cy(gate.target)
            const minY = Math.min(cy0, cy1), maxY = Math.max(cy0, cy1)
            return (
              <g key={gate.id} opacity={opacity} style={{ cursor:'pointer' }}
                onClick={() => onRemoveGate(gate.id)}>
                {isNext && <rect x={x-GATE_W/2-3} y={minY-GATE_H/2-3}
                  width={GATE_W+6} height={maxY-minY+GATE_H+6} rx={6}
                  fill="none" stroke="var(--accent-blue)" strokeWidth={2} />}
                <line x1={x} y1={cy0} x2={x} y2={cy1}
                  stroke="var(--accent-red)" strokeWidth={2} />
                <circle cx={x} cy={cy0} r={6} fill="var(--accent-red)" />
                <circle cx={x} cy={cy1} r={12} fill="none" stroke="var(--accent-red)" strokeWidth={2} />
                <line x1={x} y1={cy1-8} x2={x} y2={cy1+8} stroke="var(--accent-red)" strokeWidth={2} />
                <line x1={x-8} y1={cy1} x2={x+8} y2={cy1} stroke="var(--accent-red)" strokeWidth={2} />
              </g>
            )
          }

          // SWAP
          const x = cx(gate.step)
          const cy0 = cy(gate.qubit0), cy1 = cy(gate.qubit1)
          const minY = Math.min(cy0, cy1), maxY = Math.max(cy0, cy1)
          return (
            <g key={gate.id} opacity={opacity} style={{ cursor:'pointer' }}
              onClick={() => onRemoveGate(gate.id)}>
              {isNext && <rect x={x-GATE_W/2-3} y={minY-GATE_H/2-3}
                width={GATE_W+6} height={maxY-minY+GATE_H+6} rx={6}
                fill="none" stroke="var(--accent-blue)" strokeWidth={2} />}
              <line x1={x} y1={cy0} x2={x} y2={cy1}
                stroke="var(--accent-purple)" strokeWidth={2} />
              {[cy0, cy1].map((yy, i) => (
                <g key={i}>
                  <line x1={x-8} y1={yy-8} x2={x+8} y2={yy+8} stroke="var(--accent-purple)" strokeWidth={2} />
                  <line x1={x-8} y1={yy+8} x2={x+8} y2={yy-8} stroke="var(--accent-purple)" strokeWidth={2} />
                </g>
              ))}
            </g>
          )
        })}
      </svg>
    </div>
  )
}
