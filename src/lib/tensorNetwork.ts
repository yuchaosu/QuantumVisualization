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
    default: {
      const _exhaustive: never = gate
      throw new Error(`Unknown gate type: ${_exhaustive}`)
    }
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
    const result = [...amplitudes]
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

export function circuitToTensorNetwork(gates: CircuitGate[], numQubits: number): TensorNetwork {
  const nodes: TensorNode[] = []
  const edges: TensorEdge[] = []

  // Ket nodes — one per qubit
  for (let q = 0; q < numQubits; q++) {
    nodes.push({ id: `ket-${q}`, label: '|0⟩', kind: 'ket', rank: 1, shape: [2], qubits: [q] })
  }

  // Single result node on the right
  nodes.push({
    id: 'result', label: '|ψ⟩', kind: 'result',
    rank: numQubits, shape: Array(numQubits).fill(2),
    qubits: Array.from({ length: numQubits }, (_, i) => i),
  })

  // tail[q] tracks the id of the rightmost node on each qubit wire so far
  const tail: string[] = Array.from({ length: numQubits }, (_, q) => `ket-${q}`)

  for (const gate of gates) {  // gates arrive sorted by (step, qubit)
    const gateId = `gate-${gate.id}`
    const involvedQubits =
      gate.type === 'single' ? [gate.qubit]
      : gate.type === 'cnot' ? [gate.control, gate.target]
      : [gate.qubit0, gate.qubit1]
    const rank = involvedQubits.length * 2   // in-index + out-index per qubit
    const label = gate.type === 'single' ? gate.gate : gate.type.toUpperCase()

    nodes.push({
      id: gateId, label, kind: 'gate',
      rank, shape: Array(rank).fill(2),
      step: gate.step, qubits: involvedQubits,
    })

    for (const q of involvedQubits) {
      edges.push({ from: tail[q], to: gateId, qubit: q, indexRole: 'out' })
      tail[q] = gateId
    }
  }

  // Connect all tails to result
  for (let q = 0; q < numQubits; q++) {
    edges.push({ from: tail[q], to: 'result', qubit: q, indexRole: 'out' })
  }

  return { nodes, edges }
}

// ─── Angle parsing ────────────────────────────────────────────────────────────

function parseAngle(raw: string): number | null {
  const s = raw.trim().replace(/π/g, 'pi')
  if (s === 'pi') return Math.PI
  const piDiv  = /^pi\/(\d+(?:\.\d+)?)$/.exec(s)
  if (piDiv) return Math.PI / parseFloat(piDiv[1])
  const nPi    = /^(\d+(?:\.\d+)?)\*pi$/.exec(s)
  if (nPi) return parseFloat(nPi[1]) * Math.PI
  const nPiDiv = /^(\d+(?:\.\d+)?)\*pi\/(\d+(?:\.\d+)?)$/.exec(s)
  if (nPiDiv) return parseFloat(nPiDiv[1]) * Math.PI / parseFloat(nPiDiv[2])
  const num = parseFloat(s)
  return isNaN(num) ? null : num
}

// ─── Code parser ──────────────────────────────────────────────────────────────

const SINGLE_GATE_SET = new Set<string>(['H','X','Y','Z','S','T','Rx','Ry','Rz'])
const ROTATION_GATE_SET = new Set<string>(['Rx','Ry','Rz'])

export function parseCircuitCode(code: string): { gates: CircuitGate[]; error: string | null } {
  const fail = (msg: string) => ({ gates: [] as CircuitGate[], error: msg })

  const tokenRe = /([A-Za-z]+)\(([^)]*)\)/g
  const tokens: Array<[string, string]> = []
  let m: RegExpExecArray | null
  while ((m = tokenRe.exec(code)) !== null) tokens.push([m[1], m[2]])

  if (tokens.length === 0 && code.trim().length > 0) {
    return fail('No valid gate tokens found. Expected syntax: H(0) or CNOT(0,1).')
  }

  const gates: CircuitGate[] = []
  for (let step = 0; step < tokens.length; step++) {
    const [name, argsRaw] = tokens[step]
    const args = argsRaw.split(',').map(a => a.trim())

    if (args.length === 0 || args[0] === '') return fail(`${name}: missing qubit argument.`)

    if (name === 'CNOT') {
      if (args.length !== 2) return fail(`CNOT requires (control, target).`)
      const control = parseInt(args[0]), target = parseInt(args[1])
      if (isNaN(control) || isNaN(target)) return fail(`CNOT: qubit indices must be integers.`)
      if (control === target) return fail(`CNOT: control and target must be different qubits.`)
      gates.push({ id: `p${step}`, type: 'cnot', control, target, step })

    } else if (name === 'SWAP') {
      if (args.length !== 2) return fail(`SWAP requires (qubit0, qubit1).`)
      const qubit0 = parseInt(args[0]), qubit1 = parseInt(args[1])
      if (isNaN(qubit0) || isNaN(qubit1)) return fail(`SWAP: qubit indices must be integers.`)
      if (qubit0 === qubit1) return fail(`SWAP: qubit0 and qubit1 must be different.`)
      gates.push({ id: `p${step}`, type: 'swap', qubit0, qubit1, step })

    } else {
      if (!SINGLE_GATE_SET.has(name)) return fail(`Unknown gate: "${name}".`)
      const qubit = parseInt(args[0])
      if (isNaN(qubit)) return fail(`${name}: qubit index must be an integer.`)

      if (ROTATION_GATE_SET.has(name)) {
        if (args.length < 2) return fail(`${name}: rotation gates require an angle argument.`)
        const angle = parseAngle(args[1])
        if (angle === null) return fail(`${name}: invalid angle "${args[1]}".`)
        gates.push({ id: `p${step}`, type: 'single', gate: name as GateType, qubit, step, angle })
      } else {
        gates.push({ id: `p${step}`, type: 'single', gate: name as GateType, qubit, step })
      }
    }
  }

  return { gates, error: null }
}
