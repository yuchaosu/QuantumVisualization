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

  it('SET_GATES loads a preset circuit and resets state', () => {
    // Start with some existing gates and contraction
    let s = dispatch(initialCircuitState, { type: 'ADD_GATE', gate: { id:'g1', type:'single', gate:'H', qubit:0, step:0 } })
    s = dispatch(s, { type: 'CONTRACT_STEP' })
    expect(s.contractionStep).toBe(1)

    // Load 3-qubit algorithm preset
    const newGates: import('../../../src/lib/tensorNetwork').CircuitGate[] = [
      { id:'a0', type:'single', gate:'X', qubit:2, step:0 },
      { id:'a1', type:'single', gate:'H', qubit:0, step:1 },
    ]
    s = dispatch(s, { type: 'SET_GATES', gates: newGates, numQubits: 3 })

    expect(s.numQubits).toBe(3)
    expect(s.gates).toHaveLength(2)
    expect(s.contractionStep).toBe(0)
    expect(s.amplitudes).toHaveLength(8) // 2^3
    expect(s.amplitudes[0].re).toBeCloseTo(1) // |000⟩
    expect(s.codeText).toBe('')
    expect(s.lastGate).toBeNull()
  })

  it('UNCONTRACT_STEP is no-op at step 0', () => {
    const s = dispatch(initialCircuitState, { type: 'ADD_GATE', gate: { id:'g1', type:'single', gate:'H', qubit:0, step:0 } })
    const before = s.contractionStep
    const after = dispatch(s, { type: 'UNCONTRACT_STEP' })
    expect(after.contractionStep).toBe(before)
  })

  it('UNCONTRACT_STEP rewinds state vector correctly', () => {
    // Apply H then H (second H is its own inverse); step back should undo second H, leaving H-only state
    let s = dispatch(initialCircuitState, { type: 'ADD_GATE', gate: { id:'g1', type:'single', gate:'H', qubit:0, step:0 } })
    s = dispatch(s, { type: 'ADD_GATE', gate: { id:'g2', type:'single', gate:'H', qubit:0, step:1 } })
    s = dispatch(s, { type: 'CONTRACT_STEP' }) // apply first H
    s = dispatch(s, { type: 'CONTRACT_STEP' }) // apply second H
    expect(s.contractionStep).toBe(2)

    // After H·H on |0⟩: H·H|0⟩ = |0⟩, so amp[0] ≈ 1
    const ampAfterBoth = s.amplitudes[0].re // should be ~1

    s = dispatch(s, { type: 'UNCONTRACT_STEP' }) // undo second H
    expect(s.contractionStep).toBe(1)
    // After first H only: H|0⟩ = (|0⟩+|1⟩)/√2, amp[0] = 1/√2 ≈ 0.707
    expect(s.amplitudes[0].re).toBeCloseTo(1 / Math.SQRT2)
    expect(s.amplitudes[0].re).not.toBeCloseTo(ampAfterBoth)
    expect(s.lastGate).not.toBeNull()
    expect((s.lastGate as import('../../../src/lib/tensorNetwork').CircuitGate & { gate?: string }).gate).toBe('H')
  })
})
