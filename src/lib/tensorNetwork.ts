// src/lib/tensorNetwork.ts
import type { GateType, Complex } from './quantum'
export type { Complex }
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
function add(a: Complex, b: Complex): Complex { return { re: a.re + b.re, im: a.im + b.im } }
function mul(a: Complex, b: Complex): Complex {
  return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re }
}
function expI(angle: number): Complex { return { re: Math.cos(angle), im: Math.sin(angle) } }

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

// ─── Gate matrices ────────────────────────────────────────────────────────────

type Matrix2 = [[Complex, Complex], [Complex, Complex]]

function getSingleGateMatrix(gate: GateType, angle = 0): Matrix2 {
  const cos = Math.cos(angle / 2)
  const sin = Math.sin(angle / 2)
  const s = 1 / Math.SQRT2
  switch (gate) {
    case 'H':  return [[c(s),              c(s)       ], [c(s),       c(-s)      ]]
    case 'X':  return [[c(0),              c(1)       ], [c(1),       c(0)       ]]
    case 'Y':  return [[c(0),              c(0, -1)   ], [c(0, 1),    c(0)       ]]
    case 'Z':  return [[c(1),              c(0)       ], [c(0),       c(-1)      ]]
    case 'S':  return [[c(1),              c(0)       ], [c(0),       c(0, 1)    ]]
    case 'T':  return [[c(1),              c(0)       ], [c(0),       expI(Math.PI / 4)]]
    case 'Rx': return [[c(cos),            c(0, -sin) ], [c(0, -sin), c(cos)     ]]
    case 'Ry': return [[c(cos),            c(-sin)    ], [c(sin),     c(cos)     ]]
    case 'Rz': return [[expI(-angle / 2),  c(0)       ], [c(0),       expI(angle / 2)]]
  }
}

// ─── Apply gate ───────────────────────────────────────────────────────────────

export function applyCircuitGate(
  amplitudes: Complex[],
  gate: CircuitGate,
  numQubits: number
): Complex[] {
  if (gate.type === 'single') {
    const [[m00, m01], [m10, m11]] = getSingleGateMatrix(gate.gate, gate.angle)
    const mask = 1 << (numQubits - 1 - gate.qubit)
    const result = [...amplitudes]
    for (let i = 0; i < amplitudes.length; i++) {
      if (i & mask) continue  // only process index-0 side of each pair
      const j = i | mask
      const a = amplitudes[i]
      const b = amplitudes[j]
      result[i] = add(mul(m00, a), mul(m01, b))
      result[j] = add(mul(m10, a), mul(m11, b))
    }
    return result
  }

  if (gate.type === 'cnot') {
    const ctrlMask = 1 << (numQubits - 1 - gate.control)
    const tgtMask  = 1 << (numQubits - 1 - gate.target)
    const result: Complex[] = new Array(amplitudes.length)
    for (let i = 0; i < amplitudes.length; i++) {
      result[i & ctrlMask ? i ^ tgtMask : i] = amplitudes[i]
    }
    return result
  }

  // gate.type === 'swap'
  const mask0 = 1 << (numQubits - 1 - gate.qubit0)
  const mask1 = 1 << (numQubits - 1 - gate.qubit1)
  const result = [...amplitudes]
  for (let i = 0; i < amplitudes.length; i++) {
    const b0 = (i & mask0) !== 0
    const b1 = (i & mask1) !== 0
    if (b0 !== b1) {
      const j = i ^ mask0 ^ mask1
      if (i < j) {
        ;[result[i], result[j]] = [result[j], result[i]]
      }
    }
  }
  return result
}
