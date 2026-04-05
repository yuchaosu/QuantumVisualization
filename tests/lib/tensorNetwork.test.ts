import { getInitialState, getAmplitudeEntries, applyCircuitGate } from '../../src/lib/tensorNetwork'
import { circuitToTensorNetwork, parseCircuitCode } from '../../src/lib/tensorNetwork'
import type { Complex } from '../../src/lib/tensorNetwork'
import type { CircuitGate } from '../../src/lib/tensorNetwork'

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

const near = (a: number, b: number) => Math.abs(a - b) < 1e-10

describe('applyCircuitGate', () => {
  it('H on q0 of 2-qubit |00⟩ → (|00⟩+|10⟩)/√2', () => {
    const s = getInitialState(2)
    const r = applyCircuitGate(s, { id:'g1', type:'single', gate:'H', qubit:0, step:0 }, 2)
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
    const s: Complex[] = [{re:0,im:0},{re:0,im:0},{re:1,im:0},{re:0,im:0}]
    const r = applyCircuitGate(s, { id:'g1', type:'cnot', control:0, target:1, step:0 }, 2)
    expect(near(r[2].re, 0)).toBe(true)
    expect(near(r[3].re, 1)).toBe(true)
  })

  it('CNOT on |00⟩ → |00⟩ (control=0, no-op)', () => {
    const s = getInitialState(2)
    const r = applyCircuitGate(s, { id:'g1', type:'cnot', control:0, target:1, step:0 }, 2)
    expect(near(r[0].re, 1)).toBe(true)
    expect(near(r[1].re, 0)).toBe(true)
  })

  it('H then CNOT creates Bell state (|00⟩+|11⟩)/√2', () => {
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
