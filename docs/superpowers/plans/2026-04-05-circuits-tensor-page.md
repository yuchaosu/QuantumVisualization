# Circuits & Tensor Contraction Page — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a multi-qubit Circuits page with Circuit Grid (SVG), Tensor Network Graph (SVG), Tensor Components (heatmap/sparse), and three input modes, plus scroll-wheel + slider zoom for the Bloch Sphere.

**Architecture:** Pure quantum math in `src/lib/tensorNetwork.ts`; `CircuitPage.tsx` owns all circuit state via `useReducer`; three SVG/DOM visualization components receive derived data as props; `App.tsx` adds `page` state with `localStorage` persistence; `NavBar` gains `page`/`onNavigate` props.

**Tech Stack:** React 18, TypeScript, Vitest + jsdom + @testing-library/react, SVG (no external lib), KaTeX (existing dependency), GSAP (existing), CSS Modules.

---

## File Map

| Status | File | Notes |
|--------|------|-------|
| Create | `src/lib/tensorNetwork.ts` | All quantum math for circuits |
| Create | `tests/lib/tensorNetwork.test.ts` | Unit tests for tensor math |
| Modify | `src/components/NavBar/NavBar.tsx` | Add `page` + `onNavigate` props |
| Modify | `src/components/NavBar/NavBar.module.css` | Add `.link` class |
| Modify | `src/App.tsx` | Add page state + conditional render |
| Modify | `src/components/BlochSphere/SphereScene.tsx` | `enableZoom` + `zoomTarget` prop |
| Modify | `src/components/BlochSphere/BlochSphere.tsx` | Zoom slider + camera callback |
| Modify | `src/components/BlochSphere/BlochSphere.module.css` | `.zoomSlider` style |
| Create | `src/components/CircuitPage/CircuitPage.tsx` | Page + reducer + input modes |
| Create | `src/components/CircuitPage/CircuitPage.module.css` | Layout A styles |
| Create | `tests/components/CircuitPage/reducer.test.ts` | Reducer unit tests |
| Create | `src/components/CircuitGrid/CircuitGrid.tsx` | SVG circuit diagram |
| Create | `src/components/CircuitGrid/CircuitGrid.module.css` | |
| Create | `src/components/TensorNetworkGraph/TensorNetworkGraph.tsx` | SVG tensor graph |
| Create | `src/components/TensorNetworkGraph/TensorNetworkGraph.module.css` | |
| Create | `src/components/TensorComponents/TensorComponents.tsx` | Heatmap + sparse list |
| Create | `src/components/TensorComponents/TensorComponents.module.css` | |
| Create | `src/components/CircuitExplanation/CircuitExplanation.tsx` | 3-tab explanation |
| Create | `src/components/CircuitExplanation/CircuitExplanation.module.css` | |
| Create | `src/components/CircuitExplanation/circuitExplanationContent.ts` | Content per gate |

---

### Task 1: tensorNetwork.ts — types + getInitialState + getAmplitudeEntries

**Files:**
- Create: `src/lib/tensorNetwork.ts`
- Create: `tests/lib/tensorNetwork.test.ts`

- [ ] **Step 1: Write the failing tests**

Create `tests/lib/tensorNetwork.test.ts`:

```typescript
import { getInitialState, getAmplitudeEntries } from '../../src/lib/tensorNetwork'

describe('getInitialState', () => {
  it('returns 2^n amplitudes', () => {
    expect(getInitialState(1)).toHaveLength(2)
    expect(getInitialState(3)).toHaveLength(8)
  })

  it('index 0 is 1, rest are 0 (|00...0⟩)', () => {
    const s = getInitialState(2)
    expect(s[0]).toEqual({ re: 1, im: 0 })
    expect(s[1]).toEqual({ re: 0, im: 0 })
    expect(s[2]).toEqual({ re: 0, im: 0 })
    expect(s[3]).toEqual({ re: 0, im: 0 })
  })
})

describe('getAmplitudeEntries', () => {
  it('labels 2-qubit basis states correctly', () => {
    const entries = getAmplitudeEntries(getInitialState(2), 2)
    expect(entries[0].basis).toBe('|00⟩')
    expect(entries[1].basis).toBe('|01⟩')
    expect(entries[2].basis).toBe('|10⟩')
    expect(entries[3].basis).toBe('|11⟩')
  })

  it('computes magnitude and probSquared for |00⟩', () => {
    const entries = getAmplitudeEntries(getInitialState(2), 2)
    expect(entries[0].magnitude).toBeCloseTo(1)
    expect(entries[0].probSquared).toBeCloseTo(1)
    expect(entries[1].magnitude).toBeCloseTo(0)
  })
})
```

- [ ] **Step 2: Run test to verify it fails**

```
npx vitest run tests/lib/tensorNetwork.test.ts
```
Expected: FAIL "Cannot find module '../../src/lib/tensorNetwork'"

- [ ] **Step 3: Create src/lib/tensorNetwork.ts**

```typescript
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
function add(a: Complex, b: Complex): Complex { return { re: a.re + b.re, im: a.im + b.im } }
function mul(a: Complex, b: Complex): Complex {
  return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re }
}
function mag(a: Complex): number { return Math.sqrt(a.re * a.re + a.im * a.im) }
function arg(a: Complex): number { return Math.atan2(a.im, a.re) }
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
```

- [ ] **Step 4: Run tests to verify pass**

```
npx vitest run tests/lib/tensorNetwork.test.ts
```
Expected: PASS (all 4 tests)

- [ ] **Step 5: Commit**

```bash
git add src/lib/tensorNetwork.ts tests/lib/tensorNetwork.test.ts
git commit -m "feat: tensorNetwork.ts skeleton — types, getInitialState, getAmplitudeEntries"
```

---

### Task 2: applyCircuitGate — Kronecker product embedding

**Files:**
- Modify: `src/lib/tensorNetwork.ts`
- Modify: `tests/lib/tensorNetwork.test.ts`

**Algorithm notes:**
- Qubit 0 is the **most significant bit**. For n=2: index = q0·2 + q1·1.
- Single-qubit gate on qubit `q`: mask = `1 << (n-1-q)`. Iterate all `i` where `(i & mask) === 0`; apply 2×2 matrix to `(amp[i], amp[i|mask])`.
- CNOT(control, target): for each `i` where control bit = 1, map `i → i ^ targetMask`.
- SWAP(q0, q1): for each pair where q0 bit ≠ q1 bit, swap amplitudes.

- [ ] **Step 1: Add applyCircuitGate tests**

Append to `tests/lib/tensorNetwork.test.ts`:

```typescript
import { applyCircuitGate } from '../../src/lib/tensorNetwork'
import type { Complex } from '../../src/lib/tensorNetwork'

const near = (a: number, b: number) => Math.abs(a - b) < 1e-10

describe('applyCircuitGate', () => {
  it('H on q0 of 2-qubit |00⟩ → (|00⟩+|10⟩)/√2', () => {
    const s = getInitialState(2)
    const r = applyCircuitGate(s, { id:'g1', type:'single', gate:'H', qubit:0, step:0 }, 2)
    // amp[0] = amp[2] = 1/√2, amp[1] = amp[3] = 0
    expect(near(r[0].re, 1/Math.SQRT2)).toBe(true)
    expect(near(r[1].re, 0)).toBe(true)
    expect(near(r[2].re, 1/Math.SQRT2)).toBe(true)
    expect(near(r[3].re, 0)).toBe(true)
  })

  it('X on q1 of 2-qubit |00⟩ → |01⟩ (index 1)', () => {
    const s = getInitialState(2)
    const r = applyCircuitGate(s, { id:'g1', type:'single', gate:'X', qubit:1, step:0 }, 2)
    expect(near(r[0].re, 0)).toBe(true)
    expect(near(r[1].re, 1)).toBe(true)
  })

  it('CNOT(0→1) on |10⟩ → |11⟩', () => {
    // |10⟩ = index 2 (q0=1, q1=0)
    const s: Complex[] = [{re:0,im:0},{re:0,im:0},{re:1,im:0},{re:0,im:0}]
    const r = applyCircuitGate(s, { id:'g1', type:'cnot', control:0, target:1, step:0 }, 2)
    expect(near(r[2].re, 0)).toBe(true)
    expect(near(r[3].re, 1)).toBe(true)  // |11⟩ = index 3
  })

  it('CNOT on |00⟩ → |00⟩ (no-op when control=0)', () => {
    const s = getInitialState(2)
    const r = applyCircuitGate(s, { id:'g1', type:'cnot', control:0, target:1, step:0 }, 2)
    expect(near(r[0].re, 1)).toBe(true)
    expect(near(r[1].re, 0)).toBe(true)
  })

  it('H then CNOT(0→1) creates Bell state (|00⟩+|11⟩)/√2', () => {
    let s = getInitialState(2)
    s = applyCircuitGate(s, { id:'g1', type:'single', gate:'H', qubit:0, step:0 }, 2)
    s = applyCircuitGate(s, { id:'g2', type:'cnot', control:0, target:1, step:1 }, 2)
    expect(near(s[0].re, 1/Math.SQRT2)).toBe(true)
    expect(near(s[1].re, 0)).toBe(true)
    expect(near(s[2].re, 0)).toBe(true)
    expect(near(s[3].re, 1/Math.SQRT2)).toBe(true)
  })

  it('SWAP(0,1) on |10⟩ → |01⟩', () => {
    const s: Complex[] = [{re:0,im:0},{re:0,im:0},{re:1,im:0},{re:0,im:0}]
    const r = applyCircuitGate(s, { id:'g1', type:'swap', qubit0:0, qubit1:1, step:0 }, 2)
    expect(near(r[1].re, 1)).toBe(true)
    expect(near(r[2].re, 0)).toBe(true)
  })

  it('Z on |0⟩ leaves state unchanged', () => {
    const s = getInitialState(1)
    const r = applyCircuitGate(s, { id:'g1', type:'single', gate:'Z', qubit:0, step:0 }, 1)
    expect(near(r[0].re, 1)).toBe(true)
    expect(near(r[1].re, 0)).toBe(true)
  })
})
```

- [ ] **Step 2: Run to verify fail**

```
npx vitest run tests/lib/tensorNetwork.test.ts
```
Expected: FAIL "applyCircuitGate is not a function"

- [ ] **Step 3: Add getSingleGateMatrix + applyCircuitGate to tensorNetwork.ts**

Append after `getAmplitudeEntries`:

```typescript
// ─── Gate matrices ────────────────────────────────────────────────────────────

type Matrix2 = [[Complex, Complex], [Complex, Complex]]

function getSingleGateMatrix(gate: GateType, angle = 0): Matrix2 {
  const cos = Math.cos(angle / 2)
  const sin = Math.sin(angle / 2)
  const s = 1 / Math.SQRT2
  switch (gate) {
    case 'H':  return [[c(s),        c(s)       ], [c(s),       c(-s)      ]]
    case 'X':  return [[c(0),        c(1)       ], [c(1),       c(0)       ]]
    case 'Y':  return [[c(0),        c(0, -1)   ], [c(0, 1),    c(0)       ]]
    case 'Z':  return [[c(1),        c(0)       ], [c(0),       c(-1)      ]]
    case 'S':  return [[c(1),        c(0)       ], [c(0),       c(0, 1)    ]]
    case 'T':  return [[c(1),        c(0)       ], [c(0),       expI(Math.PI / 4)]]
    case 'Rx': return [[c(cos),      c(0, -sin) ], [c(0, -sin), c(cos)     ]]
    case 'Ry': return [[c(cos),      c(-sin)    ], [c(sin),     c(cos)     ]]
    case 'Rz': return [[expI(-angle / 2), c(0)  ], [c(0),       expI(angle / 2)]]
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
      // If control bit = 1, flip target bit; otherwise pass through
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
```

- [ ] **Step 4: Run tests to verify pass**

```
npx vitest run tests/lib/tensorNetwork.test.ts
```
Expected: PASS (all tests — 4 original + 7 new = 11 total)

- [ ] **Step 5: Commit**

```bash
git add src/lib/tensorNetwork.ts tests/lib/tensorNetwork.test.ts
git commit -m "feat: implement applyCircuitGate with Kronecker product (single/CNOT/SWAP)"
```

---

### Task 3: circuitToTensorNetwork + parseCircuitCode

**Files:**
- Modify: `src/lib/tensorNetwork.ts`
- Modify: `tests/lib/tensorNetwork.test.ts`

- [ ] **Step 1: Add tests**

Append to `tests/lib/tensorNetwork.test.ts`:

```typescript
import { circuitToTensorNetwork, parseCircuitCode } from '../../src/lib/tensorNetwork'
import type { CircuitGate } from '../../src/lib/tensorNetwork'

describe('circuitToTensorNetwork', () => {
  it('empty circuit: N ket nodes + 1 result node, N edges', () => {
    const net = circuitToTensorNetwork([], 2)
    expect(net.nodes.filter(n => n.kind === 'ket')).toHaveLength(2)
    expect(net.nodes.filter(n => n.kind === 'result')).toHaveLength(1)
    expect(net.nodes.filter(n => n.kind === 'gate')).toHaveLength(0)
    expect(net.edges).toHaveLength(2)  // ket-0→result, ket-1→result
  })

  it('single H gate: 1 gate node, 3 edges (ket→H, H→result, ket-1→result)', () => {
    const gates: CircuitGate[] = [{ id:'g1', type:'single', gate:'H', qubit:0, step:0 }]
    const net = circuitToTensorNetwork(gates, 2)
    expect(net.nodes.filter(n => n.kind === 'gate')).toHaveLength(1)
    expect(net.nodes.find(n => n.kind === 'gate')!.label).toBe('H')
    expect(net.nodes.find(n => n.kind === 'gate')!.rank).toBe(2)
    expect(net.edges).toHaveLength(3)
  })

  it('single H gate node has shape [2,2]', () => {
    const gates: CircuitGate[] = [{ id:'g1', type:'single', gate:'H', qubit:0, step:0 }]
    const gateNode = circuitToTensorNetwork(gates, 2).nodes.find(n => n.kind === 'gate')!
    expect(gateNode.shape).toEqual([2, 2])
  })

  it('CNOT gate node: rank 4, shape [2,2,2,2]', () => {
    const gates: CircuitGate[] = [{ id:'g1', type:'cnot', control:0, target:1, step:0 }]
    const net = circuitToTensorNetwork(gates, 2)
    const cnotNode = net.nodes.find(n => n.label === 'CNOT')!
    expect(cnotNode.rank).toBe(4)
    expect(cnotNode.shape).toEqual([2, 2, 2, 2])
  })

  it('all edges have indexRole "out"', () => {
    const gates: CircuitGate[] = [{ id:'g1', type:'single', gate:'H', qubit:0, step:0 }]
    const net = circuitToTensorNetwork(gates, 2)
    expect(net.edges.every(e => e.indexRole === 'out')).toBe(true)
  })
})

describe('parseCircuitCode', () => {
  it('parses H(0)', () => {
    const { gates, error } = parseCircuitCode('H(0)')
    expect(error).toBeNull()
    expect(gates).toHaveLength(1)
    expect(gates[0]).toMatchObject({ type:'single', gate:'H', qubit:0, step:0 })
  })

  it('parses CNOT(0,1)', () => {
    const { gates, error } = parseCircuitCode('CNOT(0,1)')
    expect(error).toBeNull()
    expect(gates[0]).toMatchObject({ type:'cnot', control:0, target:1 })
  })

  it('parses Rz(0,pi/4) with correct angle', () => {
    const { gates, error } = parseCircuitCode('Rz(0,pi/4)')
    expect(error).toBeNull()
    const g = gates[0] as Extract<CircuitGate, { type:'single' }>
    expect(Math.abs((g.angle ?? 0) - Math.PI / 4)).toBeLessThan(1e-10)
  })

  it('parses multiple gates, assigns sequential steps', () => {
    const { gates, error } = parseCircuitCode('H(0), CNOT(0,1)')
    expect(error).toBeNull()
    expect(gates).toHaveLength(2)
    expect(gates[0].step).toBe(0)
    expect(gates[1].step).toBe(1)
  })

  it('SWAP parses correctly', () => {
    const { gates, error } = parseCircuitCode('SWAP(0,1)')
    expect(error).toBeNull()
    expect(gates[0]).toMatchObject({ type:'swap', qubit0:0, qubit1:1 })
  })

  it('fails fast on unknown gate name', () => {
    const { gates, error } = parseCircuitCode('INVALID(0)')
    expect(error).not.toBeNull()
    expect(gates).toHaveLength(0)
  })

  it('fails on missing qubit arg', () => {
    const { gates, error } = parseCircuitCode('H()')
    expect(error).not.toBeNull()
    expect(gates).toHaveLength(0)
  })

  it('fails on CNOT same qubit', () => {
    const { gates, error } = parseCircuitCode('CNOT(1,1)')
    expect(error).not.toBeNull()
    expect(gates).toHaveLength(0)
  })

  it('parses pi (no division)', () => {
    const { gates, error } = parseCircuitCode('Rx(0,pi)')
    expect(error).toBeNull()
    const g = gates[0] as Extract<CircuitGate, { type:'single' }>
    expect(Math.abs((g.angle ?? 0) - Math.PI)).toBeLessThan(1e-10)
  })
})
```

- [ ] **Step 2: Run to verify fail**

```
npx vitest run tests/lib/tensorNetwork.test.ts
```
Expected: FAIL "circuitToTensorNetwork is not a function"

- [ ] **Step 3: Implement circuitToTensorNetwork**

Append to `src/lib/tensorNetwork.ts`:

```typescript
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
```

- [ ] **Step 4: Implement parseAngle + parseCircuitCode**

Append to `src/lib/tensorNetwork.ts`:

```typescript
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
```

- [ ] **Step 5: Run all tests**

```
npx vitest run tests/lib/tensorNetwork.test.ts
```
Expected: PASS (all tests — should be ~22 total)

- [ ] **Step 6: Commit**

```bash
git add src/lib/tensorNetwork.ts tests/lib/tensorNetwork.test.ts
git commit -m "feat: add circuitToTensorNetwork and fail-fast parseCircuitCode"
```

---

### Task 4: NavBar routing + App.tsx page state

**Files:**
- Modify: `src/components/NavBar/NavBar.tsx`
- Modify: `src/components/NavBar/NavBar.module.css`
- Modify: `src/App.tsx`
- Create: `src/components/CircuitPage/CircuitPage.tsx` (stub only)

- [ ] **Step 1: Update NavBar.tsx**

Replace the entire file:

```typescript
// src/components/NavBar/NavBar.tsx
import styles from './NavBar.module.css'

type Props = {
  theme: 'dark' | 'light'
  onToggleTheme: () => void
  page: 'bloch' | 'circuits'
  onNavigate: (page: 'bloch' | 'circuits') => void
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
        <span className={styles.linkDisabled}>Algorithms</span>
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
```

- [ ] **Step 2: Add .link class to NavBar.module.css**

Add after `.linkActive {...}` block:

```css
.link {
  color: var(--text-secondary);
  font-size: 14px;
  cursor: pointer;
}

.link:hover {
  color: var(--text-primary);
}
```

- [ ] **Step 3: Create CircuitPage stub**

Create `src/components/CircuitPage/CircuitPage.tsx`:

```typescript
// src/components/CircuitPage/CircuitPage.tsx — stub, filled in Task 6
type Props = { theme: 'dark' | 'light' }
export default function CircuitPage({ theme: _theme }: Props) {
  return <div style={{ padding: 24, color: 'var(--text-primary)', fontFamily: 'monospace' }}>
    Circuits page — coming soon
  </div>
}
```

- [ ] **Step 4: Update App.tsx — add page state**

Add after the existing `import` statements:
```typescript
import CircuitPage from './components/CircuitPage/CircuitPage'
```

Add `PAGE_STORAGE_KEY` constant and page state. Full updated `App()`:

```typescript
const PAGE_STORAGE_KEY = 'qv-page'

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState)

  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return stored === 'light' ? 'light' : 'dark'
  })

  const [page, setPage] = useState<'bloch' | 'circuits'>(() => {
    const stored = localStorage.getItem(PAGE_STORAGE_KEY)
    return stored === 'circuits' ? 'circuits' : 'bloch'
  })

  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  const handleToggleTheme = useCallback(() => setTheme(t => t === 'dark' ? 'light' : 'dark'), [])
  const handleApplyGate = useCallback((gate: GateType, angle?: number) => {
    dispatch({ type: 'APPLY_GATE', gate, angle })
  }, [])
  const handleUndo = useCallback(() => dispatch({ type: 'UNDO' }), [])
  const handleReset = useCallback(() => dispatch({ type: 'RESET' }), [])
  const handleNavigate = useCallback((p: 'bloch' | 'circuits') => {
    setPage(p)
    localStorage.setItem(PAGE_STORAGE_KEY, p)
  }, [])

  const { theta, phi } = toBlochAngles(state.alpha, state.beta)

  return (
    <div className={styles.app}>
      <NavBar
        theme={theme}
        onToggleTheme={handleToggleTheme}
        page={page}
        onNavigate={handleNavigate}
      />

      {page === 'bloch' && (
        <>
          <div className={styles.sphereRow}>
            <BlochSphere theta={theta} phi={phi} theme={theme} />
          </div>
          <GateControls
            history={state.history}
            onApplyGate={handleApplyGate}
            onUndo={handleUndo}
            onReset={handleReset}
          />
          <StateReadout alpha={state.alpha} beta={state.beta} theta={theta} phi={phi} />
          <Explanation lastGate={state.lastGate} />
        </>
      )}

      {page === 'circuits' && <CircuitPage theme={theme} />}
    </div>
  )
}
```

- [ ] **Step 5: Smoke test**

```
npm run dev
```
Verify: clicking "Circuits" in NavBar shows "coming soon" text; clicking "Bloch Sphere" returns to sphere; refresh on Circuits page stays on Circuits.

- [ ] **Step 6: Commit**

```bash
git add src/components/NavBar/NavBar.tsx src/components/NavBar/NavBar.module.css \
  src/App.tsx src/components/CircuitPage/CircuitPage.tsx
git commit -m "feat: add page routing — NavBar navigates between Bloch Sphere and Circuits"
```

---

### Task 5: Bloch Sphere zoom — scroll wheel + slider

**Files:**
- Modify: `src/components/BlochSphere/SphereScene.tsx`
- Modify: `src/components/BlochSphere/BlochSphere.tsx`
- Modify: `src/components/BlochSphere/BlochSphere.module.css`

**Zoom math:** Baseline camera position is `[1.5, 1.5, 1.5]`, distance = `√6.75 ≈ 2.598`. Zoom multiplier `z` maps to camera distance `2.598 / z`. Slider range: 0.5–3.0, default 1.0.

**Pattern:** `SphereScene` gains two new props:
- `onCameraChange(distance: number)` — called from OrbitControls `onChange`, used to sync the slider
- `zoomTarget: number | null` — non-null triggers a GSAP camera zoom animation; set to `null` via `onZoomApplied` after firing

- [ ] **Step 1: Update SphereScene.tsx Props and OrbitControls**

Replace the `Props` type:

```typescript
type Props = {
  theta: number
  phi: number
  vectorColor: string
  labelColor: string
  gridColor: string
  wireframeColor: string
  cameraPreset: 'top' | 'front' | 'free' | null
  onPresetApplied: () => void
  onCameraChange: (distance: number) => void  // NEW
  zoomTarget: number | null                    // NEW — target camera distance
  onZoomApplied: () => void                    // NEW
}
```

Update component signature to destructure new props:
```typescript
export default function SphereScene({
  theta, phi, vectorColor, labelColor, gridColor, wireframeColor,
  cameraPreset, onPresetApplied,
  onCameraChange, zoomTarget, onZoomApplied  // new
}: Props) {
```

Replace the OrbitControls line:
```tsx
<OrbitControls
  ref={controlsRef as React.RefObject<OrbitControlsImpl>}
  enablePan={false}
  enableZoom={true}
  onChange={() => {
    if (cameraRef.current) onCameraChange(cameraRef.current.position.length())
  }}
/>
```

Add a `useEffect` for `zoomTarget` (after the cameraPreset useEffect):
```typescript
useEffect(() => {
  if (zoomTarget === null || !cameraRef.current || !controlsRef.current) return
  const cam = cameraRef.current
  const controls = controlsRef.current
  const current = cam.position.length()
  if (current === 0) return
  const scale = zoomTarget / current
  gsap.to(cam.position, {
    x: cam.position.x * scale,
    y: cam.position.y * scale,
    z: cam.position.z * scale,
    duration: 0.2,
    ease: 'power2.out',
    onUpdate: () => controls.update(),
    onComplete: () => onZoomApplied(),
  })
}, [zoomTarget, onZoomApplied])
```

**Note:** `onZoomApplied` must be in the deps array. Since `BlochSphere` wraps it in `useCallback`, it is stable.

- [ ] **Step 2: Update BlochSphere.tsx**

Add imports: `useCallback` is already imported; add `useState`.

Add constants and state:
```typescript
const BASELINE_DIST = Math.sqrt(1.5 * 1.5 + 1.5 * 1.5 + 1.5 * 1.5)  // √6.75 ≈ 2.598

// Add inside component after existing state:
const [zoomMultiplier, setZoomMultiplier] = useState(1)
const [zoomTarget, setZoomTarget] = useState<number | null>(null)

const handleCameraChange = useCallback((distance: number) => {
  setZoomMultiplier(BASELINE_DIST / distance)
}, [])

const handleSliderChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
  const v = parseFloat(e.target.value)
  setZoomMultiplier(v)
  setZoomTarget(BASELINE_DIST / v)
}, [])

const handleZoomApplied = useCallback(() => setZoomTarget(null), [])
```

Update the `<SphereScene />` call to include new props:
```tsx
<SphereScene
  theta={theta}
  phi={phi}
  vectorColor={VECTOR_COLORS[theme].vector}
  labelColor={VECTOR_COLORS[theme].label}
  gridColor={VECTOR_COLORS[theme].grid}
  wireframeColor={VECTOR_COLORS[theme].wireframe}
  cameraPreset={preset}
  onPresetApplied={handlePresetApplied}
  onCameraChange={handleCameraChange}
  zoomTarget={zoomTarget}
  onZoomApplied={handleZoomApplied}
/>
```

Add zoom slider inside the `.presets` div, after the three preset buttons:
```tsx
<label className={styles.zoomLabel} title="Zoom">
  <span className={styles.zoomIcon}>🔍</span>
  <input
    type="range"
    min="0.5"
    max="3"
    step="0.05"
    value={zoomMultiplier}
    onChange={handleSliderChange}
    className={styles.zoomSlider}
    aria-label="Zoom level"
  />
</label>
```

- [ ] **Step 3: Add zoom styles to BlochSphere.module.css**

Append:
```css
.zoomLabel {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
  margin-top: 8px;
}

.zoomIcon {
  font-size: 14px;
}

.zoomSlider {
  writing-mode: vertical-lr;
  direction: rtl;
  width: 20px;
  height: 72px;
  cursor: pointer;
  accent-color: var(--accent-blue);
}
```

- [ ] **Step 4: Manual smoke test**

```
npm run dev
```
Verify:
- Scroll wheel on the sphere zooms in/out smoothly
- Dragging the slider moves the camera
- Scrolling updates the slider position (via `onCameraChange`)
- Preset buttons (Top/Front/Free) still work

- [ ] **Step 5: Commit**

```bash
git add src/components/BlochSphere/SphereScene.tsx \
  src/components/BlochSphere/BlochSphere.tsx \
  src/components/BlochSphere/BlochSphere.module.css
git commit -m "feat: add scroll wheel and slider zoom to Bloch Sphere"
```

---

### Task 6: CircuitPage.tsx — reducer + page shell

**Files:**
- Modify: `src/components/CircuitPage/CircuitPage.tsx` (replace stub)
- Create: `src/components/CircuitPage/CircuitPage.module.css`
- Create: `tests/components/CircuitPage/reducer.test.ts`

**Export `circuitReducer` and `initialCircuitState` for unit testing.** Also export the types `CircuitPageState` and `CircuitAction`.

- [ ] **Step 1: Write reducer tests**

Create `tests/components/CircuitPage/reducer.test.ts`:

```typescript
import { circuitReducer, initialCircuitState } from '../../../src/components/CircuitPage/CircuitPage'
import type { CircuitPageState, CircuitAction } from '../../../src/components/CircuitPage/CircuitPage'

function dispatch(state: CircuitPageState, action: CircuitAction): CircuitPageState {
  return circuitReducer(state, action)
}

describe('CircuitPage reducer', () => {
  it('ADD_GATE inserts in sorted (step, qubit) order', () => {
    let s = initialCircuitState
    s = dispatch(s, { type:'ADD_GATE', gate:{ id:'g2', type:'single', gate:'X', qubit:0, step:1 } })
    s = dispatch(s, { type:'ADD_GATE', gate:{ id:'g1', type:'single', gate:'H', qubit:0, step:0 } })
    expect(s.gates[0].step).toBe(0)
    expect(s.gates[1].step).toBe(1)
  })

  it('ADD_GATE rejects gate with qubit >= numQubits', () => {
    let s = { ...initialCircuitState, numQubits: 2 }
    s = dispatch(s, { type:'ADD_GATE', gate:{ id:'g1', type:'single', gate:'H', qubit:5, step:0 } })
    expect(s.gates).toHaveLength(0)  // rejected
  })

  it('REMOVE_GATE removes by id', () => {
    let s = dispatch(initialCircuitState, { type:'ADD_GATE', gate:{ id:'g1', type:'single', gate:'H', qubit:0, step:0 } })
    s = dispatch(s, { type:'REMOVE_GATE', id:'g1' })
    expect(s.gates).toHaveLength(0)
  })

  it('REMOVE_QUBIT is no-op when last qubit has a gate', () => {
    let s = { ...initialCircuitState, numQubits:2 }
    s = dispatch(s, { type:'ADD_GATE', gate:{ id:'g1', type:'single', gate:'H', qubit:1, step:0 } })
    const before = s.numQubits
    s = dispatch(s, { type:'REMOVE_QUBIT' })
    expect(s.numQubits).toBe(before)
  })

  it('REMOVE_QUBIT removes when no gate on last qubit', () => {
    let s = { ...initialCircuitState, numQubits:3 }
    s = dispatch(s, { type:'ADD_GATE', gate:{ id:'g1', type:'single', gate:'H', qubit:0, step:0 } })
    s = dispatch(s, { type:'REMOVE_QUBIT' })
    expect(s.numQubits).toBe(2)
  })

  it('REMOVE_QUBIT is no-op at numQubits=1', () => {
    let s = { ...initialCircuitState, numQubits:1 }
    s = dispatch(s, { type:'REMOVE_QUBIT' })
    expect(s.numQubits).toBe(1)
  })

  it('CONTRACT_STEP applies gate and increments contractionStep', () => {
    let s = dispatch(initialCircuitState, { type:'ADD_GATE', gate:{ id:'g1', type:'single', gate:'H', qubit:0, step:0 } })
    const ampBefore = s.amplitudes[0].re
    s = dispatch(s, { type:'CONTRACT_STEP' })
    expect(s.contractionStep).toBe(1)
    expect(s.lastGate).not.toBeNull()
    expect(s.amplitudes[0].re).not.toBeCloseTo(ampBefore)
  })

  it('CONTRACT_STEP is no-op when all gates contracted', () => {
    let s = dispatch(initialCircuitState, { type:'ADD_GATE', gate:{ id:'g1', type:'single', gate:'H', qubit:0, step:0 } })
    s = dispatch(s, { type:'CONTRACT_STEP' })
    const snapAmps = [...s.amplitudes]
    s = dispatch(s, { type:'CONTRACT_STEP' })  // already done
    expect(s.amplitudes).toEqual(snapAmps)
  })

  it('CONTRACT_ALL applies all remaining gates in one turn', () => {
    let s = dispatch(initialCircuitState, { type:'ADD_GATE', gate:{ id:'g1', type:'single', gate:'H', qubit:0, step:0 } })
    s = dispatch(s, { type:'ADD_GATE', gate:{ id:'g2', type:'cnot', control:0, target:1, step:1 } })
    s = dispatch(s, { type:'CONTRACT_ALL' })
    expect(s.contractionStep).toBe(2)
    // Bell state: amp[0] ≈ amp[3] ≈ 1/√2
    expect(Math.abs(s.amplitudes[0].re - 1/Math.SQRT2)).toBeLessThan(1e-10)
    expect(Math.abs(s.amplitudes[3].re - 1/Math.SQRT2)).toBeLessThan(1e-10)
  })

  it('ADD_QUBIT increases numQubits and resets contraction', () => {
    let s = dispatch(initialCircuitState, { type:'CONTRACT_STEP' })  // no-op but increments nothing
    s = dispatch(s, { type:'ADD_QUBIT' })
    expect(s.numQubits).toBe(3)
    expect(s.contractionStep).toBe(0)
  })

  it('ADD_QUBIT is no-op at max 10 qubits', () => {
    let s = { ...initialCircuitState, numQubits:10 }
    s = dispatch(s, { type:'ADD_QUBIT' })
    expect(s.numQubits).toBe(10)
  })

  it('RESET returns to initial state preserving numQubits', () => {
    let s = dispatch(initialCircuitState, { type:'ADD_GATE', gate:{ id:'g1', type:'single', gate:'H', qubit:0, step:0 } })
    s = dispatch(s, { type:'CONTRACT_STEP' })
    s = dispatch(s, { type:'RESET' })
    expect(s.gates).toHaveLength(0)
    expect(s.contractionStep).toBe(0)
    expect(s.amplitudes[0]).toEqual({ re:1, im:0 })
  })

  it('APPLY_CODE replaces gates and resets contraction', () => {
    let s = dispatch(initialCircuitState, { type:'ADD_GATE', gate:{ id:'g1', type:'single', gate:'H', qubit:0, step:0 } })
    s = dispatch(s, { type:'CONTRACT_STEP' })
    const newGates = [{ id:'p0', type:'single' as const, gate:'X' as const, qubit:0, step:0 }]
    s = dispatch(s, { type:'APPLY_CODE', gates: newGates })
    expect(s.gates).toHaveLength(1)
    expect(s.contractionStep).toBe(0)
  })
})
```

- [ ] **Step 2: Run to verify fail**

```
npx vitest run tests/components/CircuitPage/reducer.test.ts
```
Expected: FAIL "circuitReducer is not a function"

- [ ] **Step 3: Replace CircuitPage stub with full reducer + shell**

Replace the entire `src/components/CircuitPage/CircuitPage.tsx`:

```typescript
// src/components/CircuitPage/CircuitPage.tsx
import { useReducer, useCallback } from 'react'
import type { CircuitGate, Complex } from '../../lib/tensorNetwork'
import {
  getInitialState, applyCircuitGate, circuitToTensorNetwork, getAmplitudeEntries
} from '../../lib/tensorNetwork'
import styles from './CircuitPage.module.css'

// ─── State & Actions ─────────────────────────────────────────────────────────

export type CircuitPageState = {
  numQubits: number
  gates: CircuitGate[]
  contractionStep: number
  amplitudes: Complex[]
  inputMode: 'drag' | 'builder' | 'code'
  componentView: 'heatmap' | 'sparse'
  codeText: string
  lastGate: CircuitGate | null
}

export type CircuitAction =
  | { type: 'ADD_GATE';          gate: CircuitGate }
  | { type: 'REMOVE_GATE';       id: string }
  | { type: 'SET_INPUT_MODE';    mode: CircuitPageState['inputMode'] }
  | { type: 'SET_COMPONENT_VIEW'; view: 'heatmap' | 'sparse' }
  | { type: 'SET_CODE_TEXT';     text: string }
  | { type: 'APPLY_CODE';        gates: CircuitGate[] }
  | { type: 'ADD_QUBIT' }
  | { type: 'REMOVE_QUBIT' }
  | { type: 'CONTRACT_STEP' }
  | { type: 'CONTRACT_ALL' }
  | { type: 'RESET' }

// ─── Sort helpers ─────────────────────────────────────────────────────────────

function gateMinQubit(g: CircuitGate): number {
  if (g.type === 'single') return g.qubit
  if (g.type === 'cnot')   return Math.min(g.control, g.target)
  return Math.min(g.qubit0, g.qubit1)
}

function insertSorted(gates: CircuitGate[], gate: CircuitGate): CircuitGate[] {
  const key = gate.step * 1000 + gateMinQubit(gate)
  const idx = gates.findIndex(g => g.step * 1000 + gateMinQubit(g) > key)
  if (idx === -1) return [...gates, gate]
  return [...gates.slice(0, idx), gate, ...gates.slice(idx)]
}

function referencesQubit(g: CircuitGate, q: number): boolean {
  if (g.type === 'single') return g.qubit === q
  if (g.type === 'cnot')   return g.control === q || g.target === q
  return g.qubit0 === q || g.qubit1 === q
}

function allInvolvedQubits(g: CircuitGate): number[] {
  if (g.type === 'single') return [g.qubit]
  if (g.type === 'cnot')   return [g.control, g.target]
  return [g.qubit0, g.qubit1]
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

export const initialCircuitState: CircuitPageState = {
  numQubits: 2,
  gates: [],
  contractionStep: 0,
  amplitudes: getInitialState(2),
  inputMode: 'drag',
  componentView: 'heatmap',
  codeText: '',
  lastGate: null,
}

export function circuitReducer(state: CircuitPageState, action: CircuitAction): CircuitPageState {
  switch (action.type) {
    case 'ADD_GATE': {
      // Validate: all qubit indices must be < numQubits
      if (allInvolvedQubits(action.gate).some(q => q >= state.numQubits)) return state
      return { ...state, gates: insertSorted(state.gates, action.gate) }
    }
    case 'REMOVE_GATE':
      return { ...state, gates: state.gates.filter(g => g.id !== action.id) }

    case 'SET_INPUT_MODE':
      return { ...state, inputMode: action.mode }

    case 'SET_COMPONENT_VIEW':
      return { ...state, componentView: action.view }

    case 'SET_CODE_TEXT':
      return { ...state, codeText: action.text }

    case 'APPLY_CODE':
      return {
        ...state,
        gates: action.gates,
        contractionStep: 0,
        amplitudes: getInitialState(state.numQubits),
        lastGate: null,
      }

    case 'ADD_QUBIT': {
      if (state.numQubits >= 10) return state
      const numQubits = state.numQubits + 1
      return { ...state, numQubits, contractionStep: 0, amplitudes: getInitialState(numQubits), lastGate: null }
    }

    case 'REMOVE_QUBIT': {
      if (state.numQubits <= 1) return state
      const lastQ = state.numQubits - 1
      if (state.gates.some(g => referencesQubit(g, lastQ))) return state  // no-op
      const numQubits = state.numQubits - 1
      return {
        ...state, numQubits,
        gates: state.gates,  // gates on remaining qubits are still valid
        contractionStep: 0,
        amplitudes: getInitialState(numQubits),
        lastGate: null,
      }
    }

    case 'CONTRACT_STEP': {
      if (state.contractionStep >= state.gates.length) return state
      const gate = state.gates[state.contractionStep]
      const amplitudes = applyCircuitGate(state.amplitudes, gate, state.numQubits)
      return { ...state, contractionStep: state.contractionStep + 1, amplitudes, lastGate: gate }
    }

    case 'CONTRACT_ALL': {
      let amplitudes = state.amplitudes
      let lastGate = state.lastGate
      for (let i = state.contractionStep; i < state.gates.length; i++) {
        amplitudes = applyCircuitGate(amplitudes, state.gates[i], state.numQubits)
        lastGate = state.gates[i]
      }
      return { ...state, contractionStep: state.gates.length, amplitudes, lastGate }
    }

    case 'RESET':
      return {
        ...initialCircuitState,
        numQubits: state.numQubits,
        amplitudes: getInitialState(state.numQubits),
      }

    default:
      return state
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

type Props = { theme: 'dark' | 'light' }

export default function CircuitPage({ theme: _theme }: Props) {
  const [state, dispatch] = useReducer(circuitReducer, initialCircuitState)

  const tensorNetwork = circuitToTensorNetwork(state.gates, state.numQubits)
  const amplitudeEntries = getAmplitudeEntries(state.amplitudes, state.numQubits)

  const handleAddGate = useCallback((gate: CircuitGate) => {
    dispatch({ type: 'ADD_GATE', gate })
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.debug} aria-hidden="true">
        {state.numQubits}q · {state.gates.length} gates · step {state.contractionStep}/{state.gates.length}
        · {amplitudeEntries.length} amps · {tensorNetwork.nodes.length} nodes
        {void handleAddGate}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Create CircuitPage.module.css**

```css
/* src/components/CircuitPage/CircuitPage.module.css */
.page {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.debug {
  padding: 12px 16px;
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: 12px;
  border-bottom: 1px solid var(--border);
}
```

- [ ] **Step 5: Run reducer tests**

```
npx vitest run tests/components/CircuitPage/reducer.test.ts
```
Expected: PASS (all ~14 tests)

- [ ] **Step 6: Run all tests**

```
npm test
```
Expected: All tests pass.

- [ ] **Step 7: Commit**

```bash
git add src/components/CircuitPage/CircuitPage.tsx \
  src/components/CircuitPage/CircuitPage.module.css \
  tests/components/CircuitPage/reducer.test.ts
git commit -m "feat: CircuitPage reducer with full action set — exported for unit testing"
```

---

### Task 7: CircuitGrid SVG component

**Files:**
- Create: `src/components/CircuitGrid/CircuitGrid.tsx`
- Create: `src/components/CircuitGrid/CircuitGrid.module.css`
- Modify: `src/components/CircuitPage/CircuitPage.tsx` (temporary wiring for smoke test)

**Layout constants:** Row height 40px, column width 52px, left margin 36px (qubit labels), vertical padding 16px. Gate block: 40×32px, rx=4.

- [ ] **Step 1: Create CircuitGrid.tsx**

```typescript
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
          return (
            <g key={gate.id} opacity={opacity} style={{ cursor:'pointer' }}
              onClick={() => onRemoveGate(gate.id)}>
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
```

- [ ] **Step 2: Create CircuitGrid.module.css**

```css
/* src/components/CircuitGrid/CircuitGrid.module.css */
.container {
  overflow-x: auto;
  overflow-y: hidden;
  background: var(--bg-base);
  height: 100%;
}

.svg {
  display: block;
}

.dropZone:hover {
  stroke: var(--accent-blue) !important;
  stroke-opacity: 0.5;
}
```

- [ ] **Step 3: Wire into CircuitPage for smoke test**

In `CircuitPage.tsx`, add imports:
```typescript
import CircuitGrid from '../CircuitGrid/CircuitGrid'
```

Replace the debug div with:
```typescript
<div className={styles.circuitRow}>
  <CircuitGrid
    gates={state.gates}
    numQubits={state.numQubits}
    contractionStep={state.contractionStep}
    inputMode={state.inputMode}
    onDrop={(qubit, step, gateType) => console.log('drop', gateType, qubit, step)}
    onCellClick={(qubit, step) => console.log('click', qubit, step)}
    onRemoveGate={id => dispatch({ type: 'REMOVE_GATE', id })}
  />
</div>
```

Add to `CircuitPage.module.css`:
```css
.circuitRow {
  height: 200px;
  flex-shrink: 0;
  border-bottom: 1px solid var(--border);
  overflow: hidden;
}
```

- [ ] **Step 4: Smoke test**

```
npm run dev
```
Navigate to Circuits page. Should see 2 qubit wires (q0, q1) with dashed drop zones in drag mode. No console errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/CircuitGrid/CircuitGrid.tsx \
  src/components/CircuitGrid/CircuitGrid.module.css \
  src/components/CircuitPage/CircuitPage.tsx \
  src/components/CircuitPage/CircuitPage.module.css
git commit -m "feat: add CircuitGrid SVG with wire/gate/drop-zone rendering"
```

---

### Task 8: TensorNetworkGraph SVG component

**Files:**
- Create: `src/components/TensorNetworkGraph/TensorNetworkGraph.tsx`
- Create: `src/components/TensorNetworkGraph/TensorNetworkGraph.module.css`
- Modify: `src/components/CircuitPage/CircuitPage.tsx` (temp wiring)

**Node positions:** Ket nodes at x=60 (one per qubit row). Gate nodes at x = 60 + (step+1)×120 (columns by step). Result node at x = rightmost gate column + 120. Each qubit row is 60px tall.

- [ ] **Step 1: Create TensorNetworkGraph.tsx**

```typescript
// src/components/TensorNetworkGraph/TensorNetworkGraph.tsx
import { useState } from 'react'
import type { TensorNetwork, TensorNode } from '../../lib/tensorNetwork'
import styles from './TensorNetworkGraph.module.css'

type Props = {
  network: TensorNetwork
  numQubits: number
  contractionStep: number  // how many gate nodes have been contracted (for fade)
  maxStep: number          // highest step index in the circuit
}

const KET_X    = 60
const STEP_W   = 120
const PAD_Y    = 40
const ROW_H    = 60

function nodeX(node: TensorNode, maxStep: number): number {
  if (node.kind === 'ket')    return KET_X
  if (node.kind === 'result') return KET_X + (maxStep + 2) * STEP_W
  return KET_X + ((node.step ?? 0) + 1) * STEP_W
}

function nodeY(node: TensorNode, numQubits: number): number {
  if (node.qubits.length === 0) return PAD_Y + (numQubits - 1) * ROW_H / 2
  const avg = node.qubits.reduce((s, q) => s + q, 0) / node.qubits.length
  return PAD_Y + avg * ROW_H
}

export default function TensorNetworkGraph({ network, numQubits, contractionStep, maxStep }: Props) {
  const [tooltipId, setTooltipId] = useState<string | null>(null)

  const effectiveMax = Math.max(maxStep, 0)
  const svgW = KET_X + (effectiveMax + 3) * STEP_W
  const svgH = PAD_Y * 2 + numQubits * ROW_H

  const nodeMap = new Map(network.nodes.map(n => [n.id, n]))

  // Gate nodes sorted by step to determine which are contracted
  const gateNodes = network.nodes
    .filter(n => n.kind === 'gate')
    .sort((a, b) => (a.step ?? 0) - (b.step ?? 0))
  const contractedIds = new Set(gateNodes.slice(0, contractionStep).map(n => n.id))

  return (
    <div className={styles.container}>
      <svg width={svgW} height={svgH} className={styles.svg}>
        {/* Edges */}
        {network.edges.map((edge, i) => {
          const from = nodeMap.get(edge.from)
          const to   = nodeMap.get(edge.to)
          if (!from || !to) return null
          const contracted = contractedIds.has(edge.from) || contractedIds.has(edge.to)
          return (
            <line key={i}
              x1={nodeX(from, effectiveMax)} y1={nodeY(from, numQubits)}
              x2={nodeX(to,   effectiveMax)} y2={nodeY(to,   numQubits)}
              stroke={contracted ? 'var(--accent-green)' : 'var(--text-secondary)'}
              strokeWidth={contracted ? 2 : 1.5}
              strokeOpacity={contracted ? 0.5 : 0.8}
            />
          )
        })}

        {/* Nodes */}
        {network.nodes.map(node => {
          const x = nodeX(node, effectiveMax)
          const y = nodeY(node, numQubits)
          const contracted = contractedIds.has(node.id)
          const isTooltip  = tooltipId === node.id

          if (node.kind === 'ket') return (
            <g key={node.id}>
              <circle cx={x} cy={y} r={16}
                fill="var(--bg-surface)" stroke="var(--accent-blue)" strokeWidth={2} />
              <text x={x} y={y+4} textAnchor="middle" fill="var(--accent-blue)"
                fontSize={11} fontFamily="var(--font-mono)">|0⟩</text>
            </g>
          )

          if (node.kind === 'result') return (
            <g key={node.id}>
              <circle cx={x} cy={y} r={18}
                fill="var(--bg-surface)" stroke="var(--accent-green)" strokeWidth={2} />
              <text x={x} y={y+4} textAnchor="middle" fill="var(--accent-green)"
                fontSize={11} fontFamily="var(--font-mono)">|ψ⟩</text>
            </g>
          )

          // Gate node
          const W = 46, H = 28
          return (
            <g key={node.id}
              opacity={contracted ? 0.35 : 1}
              onMouseEnter={() => setTooltipId(node.id)}
              onMouseLeave={() => setTooltipId(null)}
              style={{ cursor: 'default' }}
            >
              <rect x={x-W/2} y={y-H/2} width={W} height={H} rx={4}
                fill="var(--bg-surface)"
                stroke={contracted ? 'var(--accent-green)' : (isTooltip ? 'var(--accent-blue)' : 'var(--border)')}
                strokeWidth={isTooltip ? 2 : 1.5}
              />
              <text x={x} y={y+4} textAnchor="middle"
                fill={contracted ? 'var(--accent-green)' : 'var(--text-primary)'}
                fontSize={11} fontFamily="var(--font-mono)">
                {node.label}
              </text>
            </g>
          )
        })}

        {/* Hover tooltip */}
        {tooltipId && (() => {
          const node = nodeMap.get(tooltipId)
          if (!node || node.kind !== 'gate') return null
          const x = nodeX(node, effectiveMax)
          const y = nodeY(node, numQubits)
          const text = `${node.label}: rank-${node.rank}, [${node.shape.join(',')}]`
          const tw = text.length * 6.5 + 16
          return (
            <g>
              <rect x={x + 8} y={y - 22} width={tw} height={26} rx={4}
                fill="var(--bg-elevated)" stroke="var(--border)" />
              <text x={x + 16} y={y - 5} fill="var(--text-secondary)" fontSize={11}
                fontFamily="var(--font-mono)">{text}</text>
            </g>
          )
        })()}
      </svg>
    </div>
  )
}
```

- [ ] **Step 2: Create TensorNetworkGraph.module.css**

```css
/* src/components/TensorNetworkGraph/TensorNetworkGraph.module.css */
.container {
  flex: 3;
  min-width: 0;
  overflow: auto;
  background: var(--bg-base);
}

.svg {
  display: block;
}
```

- [ ] **Step 3: Wire into CircuitPage below the circuit row**

In `CircuitPage.tsx`, add import and add below the circuitRow:
```typescript
import TensorNetworkGraph from '../TensorNetworkGraph/TensorNetworkGraph'

// In return, below .circuitRow:
<div className={styles.midRow}>
  <TensorNetworkGraph
    network={tensorNetwork}
    numQubits={state.numQubits}
    contractionStep={state.contractionStep}
    maxStep={state.gates.length > 0 ? Math.max(...state.gates.map(g => g.step)) : 0}
  />
</div>
```

Add to `CircuitPage.module.css`:
```css
.midRow {
  display: flex;
  flex: 1;
  min-height: 160px;
  overflow: hidden;
  border-bottom: 1px solid var(--border);
}
```

- [ ] **Step 4: Smoke test**

```
npm run dev
```
Circuits page: ket nodes (|0⟩) on left + result node (|ψ⟩) on right with connecting edges. Hover over gate nodes (after adding some via Drag & Drop) shows tooltip.

- [ ] **Step 5: Commit**

```bash
git add src/components/TensorNetworkGraph/TensorNetworkGraph.tsx \
  src/components/TensorNetworkGraph/TensorNetworkGraph.module.css \
  src/components/CircuitPage/CircuitPage.tsx \
  src/components/CircuitPage/CircuitPage.module.css
git commit -m "feat: add TensorNetworkGraph SVG with nodes, edges, contraction fading, and hover tooltips"
```

---

### Task 9: TensorComponents — heatmap + sparse list

**Files:**
- Create: `src/components/TensorComponents/TensorComponents.tsx`
- Create: `src/components/TensorComponents/TensorComponents.module.css`
- Modify: `src/components/CircuitPage/CircuitPage.tsx` (add to midRow)

- [ ] **Step 1: Create TensorComponents.tsx**

```typescript
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
  const im = Math.abs(e.magnitude * Math.sin(e.phase)).toFixed(3)
  return `${re} ${e.phase >= 0 ? '+' : '−'} ${im}i`
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
      {/* View toggle */}
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
                  style={{ width: `${e.magnitude * 100}%` }}
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
```

- [ ] **Step 2: Create TensorComponents.module.css**

```css
/* src/components/TensorComponents/TensorComponents.module.css */
.container {
  flex: 2;
  min-width: 160px;
  max-width: 320px;
  background: var(--bg-surface);
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  padding: 8px;
  overflow-y: auto;
  overflow-x: hidden;
  flex-shrink: 0;
}

.toggle {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
  flex-shrink: 0;
}

.btn {
  padding: 3px 10px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-secondary);
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

.btnActive {
  background: var(--accent-blue);
  color: #000;
  border-color: var(--accent-blue);
  font-weight: 600;
}

.grid {
  display: grid;
  gap: 2px;
  flex-shrink: 0;
}

.cell {
  border-radius: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: default;
  box-sizing: border-box;
  overflow: hidden;
}

.cellLabel {
  color: rgba(255,255,255,0.85);
  font-family: var(--font-mono);
  font-size: 7px;
  line-height: 1;
}

.legend {
  display: flex;
  flex-direction: column;
  gap: 2px;
  margin-top: 8px;
  font-size: 10px;
  color: var(--text-secondary);
  flex-shrink: 0;
}

.sparseHeader {
  font-size: 11px;
  color: var(--text-secondary);
  font-family: var(--font-mono);
  margin-bottom: 6px;
  flex-shrink: 0;
}

.sparseRow {
  display: grid;
  grid-template-columns: 44px 1fr 88px 36px;
  align-items: center;
  gap: 6px;
  font-family: var(--font-mono);
  font-size: 11px;
  margin-bottom: 4px;
}

.sparseBasis { color: var(--accent-blue); }

.sparseBarOuter {
  height: 8px;
  background: var(--bg-base);
  border-radius: 3px;
  overflow: hidden;
}

.sparseBarFill {
  height: 100%;
  background: var(--accent-blue);
  border-radius: 3px;
}

.sparseVal   { color: var(--text-primary); font-size: 10px; }
.sparsePhase { color: var(--text-secondary); }
```

- [ ] **Step 3: Add TensorComponents to CircuitPage midRow**

In `CircuitPage.tsx`, add import and update midRow:
```typescript
import TensorComponents from '../TensorComponents/TensorComponents'

// Update midRow div:
<div className={styles.midRow}>
  <TensorNetworkGraph ... />
  <TensorComponents
    entries={amplitudeEntries}
    numQubits={state.numQubits}
    view={state.componentView}
    onToggleView={() => dispatch({ type:'SET_COMPONENT_VIEW',
      view: state.componentView === 'heatmap' ? 'sparse' : 'heatmap' })}
  />
</div>
```

- [ ] **Step 4: Smoke test**

```
npm run dev
```
Circuits page: right panel shows 4-cell heatmap (|00⟩ bright, others dark) in heatmap view; toggle to Sparse shows 1 entry "|00⟩" at 100%.

- [ ] **Step 5: Commit**

```bash
git add src/components/TensorComponents/TensorComponents.tsx \
  src/components/TensorComponents/TensorComponents.module.css \
  src/components/CircuitPage/CircuitPage.tsx
git commit -m "feat: add TensorComponents with magnitude heatmap and sparse amplitude list"
```

---

### Task 10: Input modes — drag palette, builder form, code textarea

**Files:**
- Modify: `src/components/CircuitPage/CircuitPage.tsx`
- Modify: `src/components/CircuitPage/CircuitPage.module.css`

All three input UI elements plus the toolbar are rendered inline in `CircuitPage.tsx`.

- [ ] **Step 1: Add imports at top of CircuitPage.tsx**

```typescript
import { useReducer, useCallback, useState, useRef, useEffect } from 'react'
import type { GateType } from '../../lib/quantum'
import { parseCircuitCode } from '../../lib/tensorNetwork'
```

- [ ] **Step 2: Add `BuilderForm` inline component**

Add before `export default function CircuitPage`:

```typescript
function BuilderForm({
  numQubits, currentGates, onAdd
}: {
  numQubits: number
  currentGates: CircuitGate[]
  onAdd: (gate: CircuitGate) => void
}) {
  const [gateType, setGateType] = useState('H')
  const [qubit, setQubit] = useState(0)
  const [ctrl, setCtrl] = useState(0)
  const [tgt, setTgt] = useState(1)
  const [angle, setAngle] = useState(Math.PI / 2)
  const [error, setError] = useState<string | null>(null)

  const isMulti    = gateType === 'CNOT' || gateType === 'SWAP'
  const isRotation = gateType === 'Rx' || gateType === 'Ry' || gateType === 'Rz'

  // Next step = max existing step + 1 (puts new gate at end of circuit)
  const nextStep = currentGates.length === 0 ? 0
    : Math.max(...currentGates.map(g => g.step)) + 1

  function handleAdd() {
    const id = `b-${Date.now()}`
    if (isMulti) {
      if (ctrl === tgt) { setError('Control and target must be different'); return }
      onAdd(gateType === 'CNOT'
        ? { id, type:'cnot', control:ctrl, target:tgt, step:nextStep }
        : { id, type:'swap', qubit0:ctrl, qubit1:tgt, step:nextStep })
    } else {
      onAdd({
        id, type:'single',
        gate: gateType as GateType,
        qubit, step: nextStep,
        ...(isRotation ? { angle } : {}),
      })
    }
    setError(null)
  }

  return (
    <div className={styles.builderForm}>
      <select value={gateType} onChange={e => setGateType(e.target.value)} className={styles.select}>
        {['H','X','Y','Z','S','T','Rx','Ry','Rz','CNOT','SWAP'].map(g => (
          <option key={g} value={g}>{g}</option>
        ))}
      </select>
      {!isMulti ? (
        <select value={qubit} onChange={e => setQubit(+e.target.value)} className={styles.select}>
          {Array.from({length:numQubits},(_,i)=><option key={i} value={i}>q{i}</option>)}
        </select>
      ) : (
        <>
          <select value={ctrl} onChange={e => setCtrl(+e.target.value)} className={styles.select}>
            {Array.from({length:numQubits},(_,i)=><option key={i} value={i}>q{i}</option>)}
          </select>
          <span className={styles.arrow}>→</span>
          <select value={tgt} onChange={e => setTgt(+e.target.value)} className={styles.select}>
            {Array.from({length:numQubits},(_,i)=><option key={i} value={i}>q{i}</option>)}
          </select>
        </>
      )}
      {isRotation && (
        <input type="number" value={angle} step={0.1}
          onChange={e => setAngle(parseFloat(e.target.value))}
          className={styles.select} style={{width:72}} />
      )}
      <button className={styles.addBtn} onClick={handleAdd}>Add</button>
      {error && <span className={styles.errorText}>{error}</span>}
    </div>
  )
}
```

- [ ] **Step 3: Add `CodeInput` inline component**

Add after `BuilderForm`:

```typescript
function CodeInput({
  codeText, numQubits, dispatch
}: {
  codeText: string
  numQubits: number
  dispatch: React.Dispatch<CircuitAction>
}) {
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function tryApply(text: string) {
    if (!text.trim()) return
    const { gates, error: parseErr } = parseCircuitCode(text)
    if (parseErr) { setError(parseErr); return }
    const outOfRange = gates.some(g => {
      const qs = g.type === 'single' ? [g.qubit]
        : g.type === 'cnot' ? [g.control, g.target]
        : [g.qubit0, g.qubit1]
      return qs.some(q => q >= numQubits)
    })
    if (outOfRange) { setError(`Qubit index out of range (circuit has ${numQubits} qubit(s))`); return }
    setError(null)
    dispatch({ type: 'APPLY_CODE', gates })
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    dispatch({ type: 'SET_CODE_TEXT', text: e.target.value })
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => tryApply(e.target.value), 500)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (debounceRef.current) clearTimeout(debounceRef.current)
      tryApply(codeText)
    }
  }

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  return (
    <div className={styles.codeInput}>
      <textarea
        value={codeText}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        rows={2}
        placeholder="H(0), CNOT(0,1), Rz(2,pi/4) — Enter or wait 500ms to apply"
        className={`${styles.codeTextarea} ${error ? styles.codeError : ''}`}
        spellCheck={false}
      />
      {error && <div className={styles.errorText}>{error}</div>}
    </div>
  )
}
```

- [ ] **Step 4: Update CircuitPage return to include toolbar + input panels**

Replace the return block in `CircuitPage` with the full Layout A structure:

```tsx
// derive useful values for toolbar
const lastQ = state.numQubits - 1
const lastQubitHasGate = state.gates.some(g => {
  if (g.type === 'single') return g.qubit === lastQ
  if (g.type === 'cnot')   return g.control === lastQ || g.target === lastQ
  return g.qubit0 === lastQ || g.qubit1 === lastQ
})

return (
  <div className={styles.page}>
    {/* Row 1: Circuit Grid */}
    <div className={styles.circuitRow}>
      <CircuitGrid
        gates={state.gates}
        numQubits={state.numQubits}
        contractionStep={state.contractionStep}
        inputMode={state.inputMode}
        onDrop={handleAddGate_fromDrop}
        onCellClick={handleCellClick}
        onRemoveGate={id => dispatch({ type:'REMOVE_GATE', id })}
      />
    </div>

    {/* Row 2: Tensor Network + Components */}
    <div className={styles.midRow}>
      <TensorNetworkGraph
        network={tensorNetwork}
        numQubits={state.numQubits}
        contractionStep={state.contractionStep}
        maxStep={state.gates.length > 0 ? Math.max(...state.gates.map(g => g.step)) : 0}
      />
      <TensorComponents
        entries={amplitudeEntries}
        numQubits={state.numQubits}
        view={state.componentView}
        onToggleView={() => dispatch({ type:'SET_COMPONENT_VIEW',
          view: state.componentView === 'heatmap' ? 'sparse' : 'heatmap' })}
      />
    </div>

    {/* Row 3: Toolbar */}
    <div className={styles.toolbar}>
      <div className={styles.toolGroup}>
        {(['drag','builder','code'] as const).map(mode => (
          <button key={mode}
            className={`${styles.modeBtn} ${state.inputMode === mode ? styles.modeBtnActive : ''}`}
            onClick={() => dispatch({ type:'SET_INPUT_MODE', mode })}
          >{{ drag:'Drag & Drop', builder:'Builder', code:'Code' }[mode]}</button>
        ))}
      </div>
      <div className={styles.toolGroup}>
        <button className={styles.toolBtn}
          onClick={() => dispatch({ type:'ADD_QUBIT' })} disabled={state.numQubits >= 10}
        >+ Qubit</button>
        <button className={styles.toolBtn}
          onClick={() => dispatch({ type:'REMOVE_QUBIT' })}
          disabled={state.numQubits <= 1}
          title={lastQubitHasGate ? 'Remove all gates on this qubit first' : ''}
        >− Qubit</button>
        {state.numQubits > 7 && (
          <span className={styles.warning}>⚠ Large state — may be slow</span>
        )}
      </div>
      <div className={styles.toolGroup}>
        <button className={styles.toolBtn}
          onClick={() => dispatch({ type:'CONTRACT_STEP' })}
          disabled={state.contractionStep >= state.gates.length}
        >Step ▶</button>
        <button className={styles.toolBtn}
          onClick={() => dispatch({ type:'CONTRACT_ALL' })}
          disabled={state.contractionStep >= state.gates.length}
        >Contract All ⚡</button>
        <button className={styles.toolBtn} onClick={() => dispatch({ type:'RESET' })}>Reset</button>
      </div>
    </div>

    {/* Row 4: Input panel (one at a time) */}
    {state.inputMode === 'drag' && (
      <div className={styles.palette}>
        {['H','X','Y','Z','S','T','Rx','Ry','Rz','CNOT','SWAP'].map(gt => (
          <div key={gt} className={styles.chip}
            draggable
            onDragStart={e => e.dataTransfer.setData('gateType', gt)}
          >{gt}</div>
        ))}
      </div>
    )}
    {state.inputMode === 'builder' && (
      <BuilderForm numQubits={state.numQubits} currentGates={state.gates} onAdd={handleAddGate} />
    )}
    {state.inputMode === 'code' && (
      <CodeInput codeText={state.codeText} numQubits={state.numQubits} dispatch={dispatch} />
    )}

    {/* Row 5: Explanation */}
    {/* Added in Task 11 */}
  </div>
)
```

Add the drop handler:
```typescript
const handleAddGate_fromDrop = useCallback((qubit: number, step: number, gateType: string) => {
  const id = `d-${Date.now()}-${Math.random().toString(36).slice(2,5)}`
  if (gateType === 'CNOT') {
    const target = qubit < state.numQubits - 1 ? qubit + 1 : qubit - 1
    dispatch({ type:'ADD_GATE', gate:{ id, type:'cnot', control:qubit, target, step } })
  } else if (gateType === 'SWAP') {
    const other = qubit < state.numQubits - 1 ? qubit + 1 : qubit - 1
    dispatch({ type:'ADD_GATE', gate:{ id, type:'swap', qubit0:qubit, qubit1:other, step } })
  } else {
    dispatch({ type:'ADD_GATE', gate:{ id, type:'single', gate:gateType as GateType, qubit, step } })
  }
}, [state.numQubits, dispatch])

const handleCellClick = useCallback((_qubit: number, _step: number) => {
  // Builder mode: click-to-add is a future enhancement; builder form is the primary input
}, [])
```

- [ ] **Step 5: Update CircuitPage.module.css with toolbar + input styles**

Append to `CircuitPage.module.css`:

```css
.toolbar {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 16px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  flex-wrap: wrap;
}

.toolGroup {
  display: flex;
  align-items: center;
  gap: 6px;
}

.modeBtn {
  padding: 4px 12px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-secondary);
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}
.modeBtnActive {
  background: var(--bg-elevated);
  color: var(--text-primary);
  border-color: var(--accent-blue);
}

.toolBtn {
  padding: 4px 10px;
  border: 1px solid var(--border);
  background: transparent;
  color: var(--text-secondary);
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}
.toolBtn:hover:not(:disabled) { color: var(--text-primary); border-color: var(--accent-blue); }
.toolBtn:disabled { opacity: 0.4; cursor: not-allowed; }

.warning {
  font-size: 12px;
  color: #e3b341;
}

.palette {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  padding: 8px 16px;
  background: var(--bg-base);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.chip {
  padding: 4px 10px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 4px;
  font-family: var(--font-mono);
  font-size: 12px;
  cursor: grab;
  color: var(--text-primary);
  user-select: none;
}
.chip:hover { border-color: var(--accent-blue); }
.chip:active { cursor: grabbing; }

.builderForm {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--bg-base);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
  flex-wrap: wrap;
}

.select {
  padding: 4px 8px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-primary);
  font-size: 12px;
  font-family: var(--font-mono);
}

.arrow { color: var(--text-secondary); font-size: 12px; }

.addBtn {
  padding: 4px 14px;
  background: var(--accent-blue);
  border: none;
  border-radius: 4px;
  color: #000;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.codeInput {
  padding: 8px 16px;
  background: var(--bg-base);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.codeTextarea {
  width: 100%;
  padding: 6px 10px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  border-radius: 4px;
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 13px;
  resize: none;
  box-sizing: border-box;
}
.codeError { border-color: var(--accent-red) !important; }
.errorText { color: var(--accent-red); font-size: 12px; margin-top: 4px; display: block; }
```

- [ ] **Step 6: Integration smoke test**

```
npm run dev
```
Verify:
1. Drag `H` chip onto q0 cell → gate appears in circuit grid and tensor network updates
2. Switch to Builder → select X, q1, Add → X gate appears on q1 row
3. Switch to Code → type `H(0), CNOT(0,1)` → wait 500ms → circuit resets to Bell-state circuit
4. Type `INVALID(0)` → red border + error message
5. Click `Step ▶` → first gate contracts (opacity drop + H node fades in tensor graph)
6. Click `Contract All ⚡` → all gates contracted; heatmap updates

- [ ] **Step 7: Commit**

```bash
git add src/components/CircuitPage/CircuitPage.tsx \
  src/components/CircuitPage/CircuitPage.module.css
git commit -m "feat: add drag-and-drop palette, builder form, and code textarea to CircuitPage"
```

---

### Task 11: CircuitExplanation panel + gate content

**Files:**
- Create: `src/components/CircuitExplanation/circuitExplanationContent.ts`
- Create: `src/components/CircuitExplanation/CircuitExplanation.tsx`
- Create: `src/components/CircuitExplanation/CircuitExplanation.module.css`
- Modify: `src/components/CircuitPage/CircuitPage.tsx` (add explanation row)

- [ ] **Step 1: Create circuitExplanationContent.ts**

```typescript
// src/components/CircuitExplanation/circuitExplanationContent.ts
import type { CircuitGate } from '../../lib/tensorNetwork'

export type CircuitExplanationEntry = {
  title: string
  beginner: string
  matrix: string   // KaTeX LaTeX string
  deeper: string
}

const DEFAULT: CircuitExplanationEntry = {
  title: 'Quantum Circuit',
  beginner: 'A quantum circuit is a sequence of gates applied left-to-right to qubits. Multi-qubit gates like CNOT entangle qubits — creating correlations with no classical equivalent.',
  matrix: String.raw`|\psi\rangle = \sum_{i=0}^{2^n-1} \alpha_i\,|i\rangle, \quad \sum_i|\alpha_i|^2 = 1`,
  deeper: 'An n-qubit circuit operates in ℂ^(2ⁿ). Each gate is a unitary U ∈ U(2ⁿ). The circuit unitary is the product U_k ⋯ U_1. In the tensor network picture, each gate is a tensor whose indices are contracted along qubit wires.',
}

const GATES: Record<string, CircuitExplanationEntry> = {
  H: {
    title: 'Hadamard Gate (H)',
    beginner: 'Creates equal superposition: H|0⟩ = (|0⟩+|1⟩)/√2. Applied twice returns to |0⟩. H is the primary gate for creating quantum parallelism.',
    matrix: String.raw`H = \frac{1}{\sqrt{2}}\begin{pmatrix}1 & 1 \\ 1 & -1\end{pmatrix}`,
    deeper: 'As a rank-2 tensor, H has shape [2,2]. Contraction of H with |0⟩ gives equal superposition. H rotates π around the (X+Z)/√2 axis of the Bloch sphere. It maps the computational basis to the Hadamard basis.',
  },
  X: {
    title: 'Pauli-X Gate (X)',
    beginner: 'The quantum NOT gate: flips |0⟩↔|1⟩. In superposition it rotates 180° around the X axis.',
    matrix: String.raw`X = \begin{pmatrix}0 & 1 \\ 1 & 0\end{pmatrix}`,
    deeper: 'Rank-2 tensor. Contraction swaps the |0⟩ and |1⟩ amplitudes. X = Rx(π) up to global phase.',
  },
  Y: {
    title: 'Pauli-Y Gate (Y)',
    beginner: 'Rotates 180° around the Y axis, flipping the qubit and adding an imaginary phase.',
    matrix: String.raw`Y = \begin{pmatrix}0 & -i \\ i & 0\end{pmatrix}`,
    deeper: 'Rank-2 tensor with complex entries. Y = iXZ. The imaginary unit creates a phase that matters for interference in subsequent gates.',
  },
  Z: {
    title: 'Pauli-Z Gate (Z)',
    beginner: 'Leaves |0⟩ unchanged, maps |1⟩ to −|1⟩. Invisible to measurement but crucial for phase interference.',
    matrix: String.raw`Z = \begin{pmatrix}1 & 0 \\ 0 & -1\end{pmatrix}`,
    deeper: 'Diagonal rank-2 tensor. Contraction multiplies the |1⟩ amplitude by −1. Z = S² = T⁴.',
  },
  S: {
    title: 'S Gate (Phase)',
    beginner: 'A quarter-turn phase gate. Leaves |0⟩ unchanged; multiplies |1⟩ by i.',
    matrix: String.raw`S = \begin{pmatrix}1 & 0 \\ 0 & i\end{pmatrix}`,
    deeper: 'S = Z^{1/2}. Diagonal rank-2 tensor. S introduces e^{iπ/2} on |1⟩. Together with H and CNOT it generates the Clifford group.',
  },
  T: {
    title: 'T Gate (π/8 Gate)',
    beginner: 'Rotates |1⟩ by 45°. Essential for universal quantum computation beyond the Clifford group.',
    matrix: String.raw`T = \begin{pmatrix}1 & 0 \\ 0 & e^{i\pi/4}\end{pmatrix}`,
    deeper: 'T = Z^{1/4}. Not in the Clifford group — needed for universal quantum computation. Rank-2 diagonal tensor.',
  },
  Rx: {
    title: 'Rx(θ) Rotation',
    beginner: 'Rotates the qubit by θ around the X axis. Rx(π) = X gate (up to phase).',
    matrix: String.raw`R_x(\theta)=\begin{pmatrix}\cos\tfrac\theta2&-i\sin\tfrac\theta2\\-i\sin\tfrac\theta2&\cos\tfrac\theta2\end{pmatrix}`,
    deeper: 'Rx(θ) = exp(−iθX/2). Rank-2 tensor. Contraction rotates the amplitude vector in the YZ Bloch-sphere plane.',
  },
  Ry: {
    title: 'Ry(θ) Rotation',
    beginner: 'Rotates the qubit by θ around the Y axis. Real-valued matrix — useful for real-amplitude circuits.',
    matrix: String.raw`R_y(\theta)=\begin{pmatrix}\cos\tfrac\theta2&-\sin\tfrac\theta2\\\sin\tfrac\theta2&\cos\tfrac\theta2\end{pmatrix}`,
    deeper: 'Ry(θ) = exp(−iθY/2). Only real-valued rotation gate. Rank-2 tensor useful in variational quantum circuits.',
  },
  Rz: {
    title: 'Rz(θ) Rotation',
    beginner: 'Rotates the qubit around the Z axis by θ — changes only the relative phase between |0⟩ and |1⟩.',
    matrix: String.raw`R_z(\theta)=\begin{pmatrix}e^{-i\theta/2}&0\\0&e^{i\theta/2}\end{pmatrix}`,
    deeper: 'Rz(θ) = exp(−iθZ/2). Diagonal rank-2 tensor. Applies phase e^{-iθ/2} to |0⟩ and e^{iθ/2} to |1⟩. Rz(π/2) ≈ S, Rz(π/4) ≈ T.',
  },
  CNOT: {
    title: 'CNOT — Controlled-NOT',
    beginner: 'Two-qubit gate: flips the target qubit when control = |1⟩. CNOT + H creates entanglement (Bell states).',
    matrix: String.raw`\text{CNOT}=\begin{pmatrix}1&0&0&0\\0&1&0&0\\0&0&0&1\\0&0&1&0\end{pmatrix}`,
    deeper: 'Rank-4 tensor, shape [2,2,2,2] (control-in, target-in, control-out, target-out). Maps |00⟩→|00⟩, |01⟩→|01⟩, |10⟩→|11⟩, |11⟩→|10⟩. In the tensor network, CNOT creates cross-qubit edges that encode entanglement.',
  },
  SWAP: {
    title: 'SWAP Gate',
    beginner: 'Exchanges the states of two qubits: |ab⟩ → |ba⟩. Used to route qubits on hardware with limited connectivity.',
    matrix: String.raw`\text{SWAP}=\begin{pmatrix}1&0&0&0\\0&0&1&0\\0&1&0&0\\0&0&0&1\end{pmatrix}`,
    deeper: 'Rank-4 tensor, shape [2,2,2,2]. SWAP = CNOT(a→b)·CNOT(b→a)·CNOT(a→b). In tensor networks, SWAP can be replaced by three CNOT tensors connected in sequence.',
  },
}

export function getCircuitExplanation(gate: CircuitGate | null): CircuitExplanationEntry {
  if (!gate) return DEFAULT
  const key = gate.type === 'single' ? gate.gate
    : gate.type === 'cnot' ? 'CNOT' : 'SWAP'
  return GATES[key] ?? DEFAULT
}
```

- [ ] **Step 2: Create CircuitExplanation.tsx** (mirrors `Explanation.tsx` pattern)

```typescript
// src/components/CircuitExplanation/CircuitExplanation.tsx
import { useState, useMemo } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import type { CircuitGate } from '../../lib/tensorNetwork'
import { getCircuitExplanation } from './circuitExplanationContent'
import styles from './CircuitExplanation.module.css'

type Tab = 'beginner' | 'matrix' | 'deeper'

export default function CircuitExplanation({ lastGate }: { lastGate: CircuitGate | null }) {
  const [tab, setTab] = useState<Tab>('beginner')
  const entry = getCircuitExplanation(lastGate)

  const matrixHtml = useMemo(
    () => katex.renderToString(entry.matrix, { throwOnError: false, displayMode: true }),
    [entry.matrix]
  )

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>{entry.title}</span>
        <div className={styles.tabs}>
          {(['beginner','matrix','deeper'] as Tab[]).map(t => (
            <button key={t}
              className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}
              onClick={() => setTab(t)}
            >{t.charAt(0).toUpperCase() + t.slice(1)}</button>
          ))}
        </div>
      </div>
      <div className={styles.content}>
        {tab === 'beginner' && <p>{entry.beginner}</p>}
        {tab === 'matrix' && (
          <div className={styles.matrixContent} dangerouslySetInnerHTML={{ __html: matrixHtml }} />
        )}
        {tab === 'deeper' && <p>{entry.deeper}</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Create CircuitExplanation.module.css** (identical to `Explanation.module.css`)

Copy the content from `src/components/Explanation/Explanation.module.css` verbatim into `src/components/CircuitExplanation/CircuitExplanation.module.css`.

- [ ] **Step 4: Wire CircuitExplanation into CircuitPage**

Add import at top:
```typescript
import CircuitExplanation from '../CircuitExplanation/CircuitExplanation'
```

Add as the last row in the return (after the input panel rows):
```tsx
<CircuitExplanation lastGate={state.lastGate} />
```

- [ ] **Step 5: Manual smoke test**

```
npm run dev
```
Circuits page shows explanation panel at bottom. Default text shows "Quantum Circuit". Apply H then Step ▶ → explanation changes to "Hadamard Gate (H)". Switch tabs: Beginner/Matrix/Deeper all work. Matrix tab renders KaTeX.

- [ ] **Step 6: Commit**

```bash
git add src/components/CircuitExplanation/CircuitExplanation.tsx \
  src/components/CircuitExplanation/CircuitExplanation.module.css \
  src/components/CircuitExplanation/circuitExplanationContent.ts \
  src/components/CircuitPage/CircuitPage.tsx
git commit -m "feat: add CircuitExplanation panel with 3-tab KaTeX explanations for all gates"
```

---

### Task 12: Final integration — smoke test + build check

**Files:**
- Modify: `src/components/CircuitPage/CircuitPage.tsx` (any remaining lint fixes)

- [ ] **Step 1: Run the full test suite**

```
npm test
```
Expected: All tests PASS. Count should include:
- `tests/lib/quantum.test.ts` (existing — unchanged)
- `tests/lib/tensorNetwork.test.ts` (~22 tests)
- `tests/components/CircuitPage/reducer.test.ts` (~14 tests)

- [ ] **Step 2: TypeScript build check**

```
npm run build
```
Expected: No TypeScript errors. Fix any `noUnusedLocals` or `noUnusedParameters` violations:
- Remove `void handleAddGate` debug hack if still present
- Ensure all props are used or prefixed with `_` if intentionally unused

- [ ] **Step 3: Full end-to-end walkthrough**

```
npm run dev
```
Walk through the complete feature:

1. **Navigation:** Click Circuits → page switches. Click Bloch Sphere → returns. Refresh on Circuits → stays (localStorage).
2. **Layout A:** Circuit Grid full-width on top; Tensor Network (60%) + Components (40%) side by side below; toolbar; input panel; explanation.
3. **Drag & Drop:** Drag H onto q0 step 0 → gate appears. Drag CNOT onto q0 step 1 → CNOT connector between q0/q1.
4. **Builder:** Switch to Builder, select Rz, q1, angle 1.57, Add → Rz gate appears.
5. **Code mode:** Switch to Code, type `H(0), CNOT(0,1)`, wait 500ms → circuit updates. Type syntax error → red border + error.
6. **Qubit controls:** Add Qubit → 3 qubit wires. Remove Qubit (no gate on q2) → back to 2. Try remove when q1 has a gate → button tooltip appears, no change.
7. **Contraction:** Step ▶ applies H, heatmap updates to (|00⟩+|10⟩)/√2. Step ▶ again applies CNOT → Bell state. Explanation shows CNOT entry.
8. **Contract All:** Reset, add H+CNOT, click Contract All ⚡ → jumps to Bell state in one click.
9. **Tensor Network:** Gate nodes fade at 35% after contraction. Hover a gate node → tooltip shows rank/shape.
10. **Heatmap ↔ Sparse:** Toggle shows 2 bright cells (Bell state). Sparse shows |00⟩ and |11⟩ at ~50%.
11. **Bloch Sphere zoom:** Navigate to Bloch Sphere. Scroll on sphere → zooms. Drag slider → zooms. Slider updates as you scroll.
12. **10-qubit warning:** Add qubits past 7 → warning banner appears.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: Circuits page complete — circuit grid, tensor network, contraction, input modes, explanation + Bloch Sphere zoom"
```
