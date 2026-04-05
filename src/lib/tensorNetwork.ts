// src/lib/tensorNetwork.ts
import type { GateType } from './quantum'

export type Complex = { re: number; im: number }
export type QubitId = number  // 0-indexed

export type CircuitGate =
  | { id: string; type: 'single'; gate: GateType; qubit: QubitId; step: number; angle?: number }
  | { id: string; type: 'cnot';   control: QubitId; target: QubitId; step: number }
  | { id: string; type: 'swap';   qubit0: QubitId;  qubit1: QubitId; step: number }

export type TensorNode = {
  id: string
  label: string
  kind: 'ket' | 'gate' | 'result'
  rank: number
  shape: number[]
  step?: number
  qubits: QubitId[]
}

export type TensorEdge = {
  from: string
  to: string
  qubit: QubitId
  indexRole: 'in' | 'out'
}

export type TensorNetwork = {
  nodes: TensorNode[]
  edges: TensorEdge[]
}

export type AmplitudeEntry = {
  basis: string
  index: number
  magnitude: number
  phase: number
  probSquared: number
}

// ─── Internal complex helpers ─────────────────────────────────────────────────

function c(re: number, im = 0): Complex { return { re, im } }
function mag(a: Complex): number { return Math.sqrt(a.re * a.re + a.im * a.im) }
function arg(a: Complex): number { return Math.atan2(a.im, a.re) }

// ─── Exported functions ───────────────────────────────────────────────────────

export function getInitialState(numQubits: number): Complex[] {
  const size = 1 << numQubits
  const state: Complex[] = Array.from({ length: size }, () => c(0))
  state[0] = c(1)
  return state
}

export function getAmplitudeEntries(amplitudes: Complex[], numQubits: number): AmplitudeEntry[] {
  return amplitudes.map((amp, index) => {
    const basis = '|' + index.toString(2).padStart(numQubits, '0') + '⟩'
    const magnitude = mag(amp)
    const phase = arg(amp)
    return { basis, index, magnitude, phase, probSquared: magnitude * magnitude }
  })
}
