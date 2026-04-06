import { describe, it, expect } from 'vitest'
import { ALGORITHMS, getAlgorithmById } from '../../src/lib/algorithms'
import { getInitialState, applyCircuitGate } from '../../src/lib/tensorNetwork'

function runCircuit(algoId: string) {
  const algo = getAlgorithmById(algoId)
  let amps = getInitialState(algo.numQubits)
  for (const gate of algo.gates) {
    amps = applyCircuitGate(amps, gate, algo.numQubits)
  }
  return amps
}

function prob(amps: ReturnType<typeof getInitialState>, index: number) {
  const a = amps[index]
  return a.re * a.re + a.im * a.im
}

describe('ALGORITHMS data', () => {
  it('has exactly 5 algorithms', () => {
    expect(ALGORITHMS).toHaveLength(5)
  })

  it('getAlgorithmById returns correct algorithm', () => {
    expect(getAlgorithmById('deutsch-jozsa').name).toBe('Deutsch–Jozsa')
  })

  it('every algorithm has an intro step with gateIndex -1', () => {
    for (const algo of ALGORITHMS) {
      expect(algo.steps[0].gateIndex).toBe(-1)
    }
  })

  it('every gate id is unique within its algorithm', () => {
    for (const algo of ALGORITHMS) {
      const ids = algo.gates.map(g => g.id)
      expect(new Set(ids).size).toBe(ids.length)
    }
  })
})

describe('Deutsch–Jozsa circuit', () => {
  it('q0 has probability 1 in the |1⟩ subspace (balanced oracle)', () => {
    const amps = runCircuit('deutsch-jozsa')
    // 2 qubits: q0 is MSB. |q0=1⟩ = indices 2,3
    const pQ0is1 = prob(amps, 2) + prob(amps, 3)
    expect(pQ0is1).toBeCloseTo(1, 5)
  })
})

describe('Bernstein–Vazirani circuit (s="11")', () => {
  it('q0=1, q1=1 subspace has probability 1', () => {
    const amps = runCircuit('bernstein-vazirani')
    // 3 qubits: q0 MSB. q0=1,q1=1 → indices 6 (110) and 7 (111)
    const p = prob(amps, 6) + prob(amps, 7)
    expect(p).toBeCloseTo(1, 5)
  })
})

describe("Grover's Search circuit (marked: |11⟩)", () => {
  it('|11⟩ (index 3) has probability ≈ 1 after 1 iteration', () => {
    const amps = runCircuit('grover')
    expect(prob(amps, 3)).toBeCloseTo(1, 5)
  })
})

describe('Quantum Teleportation circuit', () => {
  it('q2 ends in |+⟩: prob(q2=0) ≈ 0.5 and prob(q2=1) ≈ 0.5', () => {
    const amps = runCircuit('teleportation')
    // 3 qubits, q2 is LSB. q2=0: indices 0,2,4,6. q2=1: indices 1,3,5,7
    const pQ2is0 = [0,2,4,6].reduce((s,i) => s + prob(amps, i), 0)
    const pQ2is1 = [1,3,5,7].reduce((s,i) => s + prob(amps, i), 0)
    expect(pQ2is0).toBeCloseTo(0.5, 3)
    expect(pQ2is1).toBeCloseTo(0.5, 3)
  })
})

describe('QFT circuit on |000⟩', () => {
  it('produces uniform amplitude magnitudes (1/√8 each)', () => {
    const amps = runCircuit('qft')
    const expected = 1 / Math.sqrt(8)
    for (const a of amps) {
      const mag = Math.sqrt(a.re * a.re + a.im * a.im)
      expect(mag).toBeCloseTo(expected, 3)
    }
  })
})
