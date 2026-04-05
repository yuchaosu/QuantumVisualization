// tests/lib/quantum.test.ts
import { describe, it, expect } from 'vitest'
import { applyGate, toBlochAngles } from '../../src/lib/quantum'

const ZERO = { re: 1, im: 0 }   // |0⟩: alpha=1, beta=0
const ONE  = { re: 0, im: 0 }   // used as beta for |0⟩

const I_STATE = { re: 1, im: 0 } // will vary per test

const TOL = 1e-10
const near = (a: number, b: number) => Math.abs(a - b) < TOL

describe('toBlochAngles', () => {
  it('returns {theta:0, phi:0} for |0⟩', () => {
    const r = toBlochAngles({ re: 1, im: 0 }, { re: 0, im: 0 })
    expect(near(r.theta, 0)).toBe(true)
    expect(near(r.phi, 0)).toBe(true)
  })

  it('returns {theta:π, phi:0} for |1⟩', () => {
    const r = toBlochAngles({ re: 0, im: 0 }, { re: 1, im: 0 })
    expect(near(r.theta, Math.PI)).toBe(true)
    expect(near(r.phi, 0)).toBe(true)
  })

  it('returns {theta:π/2, phi:0} for |+⟩ = (|0⟩+|1⟩)/√2', () => {
    const s = 1 / Math.sqrt(2)
    const r = toBlochAngles({ re: s, im: 0 }, { re: s, im: 0 })
    expect(near(r.theta, Math.PI / 2)).toBe(true)
    expect(near(r.phi, 0)).toBe(true)
  })
})

describe('applyGate', () => {
  it('X on |0⟩ gives |1⟩ (theta=π)', () => {
    const [a, b] = applyGate({ re: 1, im: 0 }, { re: 0, im: 0 }, 'X')
    expect(near(Math.abs(a.re), 0)).toBe(true)
    expect(near(Math.abs(b.re), 1)).toBe(true)
  })

  it('Z on |0⟩ leaves state unchanged', () => {
    const [a, b] = applyGate({ re: 1, im: 0 }, { re: 0, im: 0 }, 'Z')
    expect(near(a.re, 1) && near(a.im, 0)).toBe(true)
    expect(near(b.re, 0) && near(b.im, 0)).toBe(true)
  })

  it('H applied twice returns original state within tolerance', () => {
    const alpha0 = { re: 1, im: 0 }
    const beta0  = { re: 0, im: 0 }
    const [a1, b1] = applyGate(alpha0, beta0, 'H')
    const [a2, b2] = applyGate(a1, b1, 'H')
    expect(near(a2.re, alpha0.re) && near(a2.im, alpha0.im)).toBe(true)
    expect(near(b2.re, beta0.re)  && near(b2.im, beta0.im)).toBe(true)
  })

  it('Ry(π) is equivalent to X gate on |0⟩ (up to global phase)', () => {
    const [a1, b1] = applyGate({ re: 1, im: 0 }, { re: 0, im: 0 }, 'Ry', Math.PI)
    const [a2, b2] = applyGate({ re: 1, im: 0 }, { re: 0, im: 0 }, 'X')
    // Both should put the state near |1⟩: |alpha| ≈ 0, |beta| ≈ 1
    const mag1alpha = Math.sqrt(a1.re**2 + a1.im**2)
    const mag2alpha = Math.sqrt(a2.re**2 + a2.im**2)
    expect(near(mag1alpha, 0)).toBe(true)
    expect(near(mag2alpha, 0)).toBe(true)
  })
})
