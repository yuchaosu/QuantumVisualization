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
