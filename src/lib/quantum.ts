// src/lib/quantum.ts

export type Complex = { re: number; im: number }
export type GateType = 'H' | 'X' | 'Y' | 'Z' | 'S' | 'T' | 'Rx' | 'Ry' | 'Rz'

// Complex arithmetic helpers
function add(a: Complex, b: Complex): Complex {
  return { re: a.re + b.re, im: a.im + b.im }
}
function mul(a: Complex, b: Complex): Complex {
  return { re: a.re * b.re - a.im * b.im, im: a.re * b.im + a.im * b.re }
}
function scale(c: Complex, s: number): Complex {
  return { re: c.re * s, im: c.im * s }
}
function mag(c: Complex): number {
  return Math.sqrt(c.re * c.re + c.im * c.im)
}
function arg(c: Complex): number {
  return Math.atan2(c.im, c.re)
}
function expI(angle: number): Complex {
  return { re: Math.cos(angle), im: Math.sin(angle) }
}

// Apply 2x2 unitary matrix [[a,b],[c,d]] to state vector [alpha, beta]
function applyMatrix(
  a: Complex, b: Complex, c: Complex, d: Complex,
  alpha: Complex, beta: Complex
): [Complex, Complex] {
  return [
    add(mul(a, alpha), mul(b, beta)),
    add(mul(c, alpha), mul(d, beta)),
  ]
}

export function applyGate(
  alpha: Complex,
  beta: Complex,
  gate: GateType,
  angle?: number
): [Complex, Complex] {
  const s2 = 1 / Math.sqrt(2)
  const th = angle ?? 0

  switch (gate) {
    case 'H':
      return applyMatrix(
        scale({ re: 1, im: 0 }, s2), scale({ re: 1, im: 0 }, s2),
        scale({ re: 1, im: 0 }, s2), scale({ re: -1, im: 0 }, s2),
        alpha, beta
      )
    case 'X':
      return applyMatrix(
        { re: 0, im: 0 }, { re: 1, im: 0 },
        { re: 1, im: 0 }, { re: 0, im: 0 },
        alpha, beta
      )
    case 'Y':
      return applyMatrix(
        { re: 0, im: 0 }, { re: 0, im: -1 },
        { re: 0, im: 1 },  { re: 0, im: 0 },
        alpha, beta
      )
    case 'Z':
      return applyMatrix(
        { re: 1, im: 0 },  { re: 0, im: 0 },
        { re: 0, im: 0 }, { re: -1, im: 0 },
        alpha, beta
      )
    case 'S':
      return applyMatrix(
        { re: 1, im: 0 }, { re: 0, im: 0 },
        { re: 0, im: 0 }, { re: 0, im: 1 },
        alpha, beta
      )
    case 'T':
      return applyMatrix(
        { re: 1, im: 0 },  { re: 0, im: 0 },
        { re: 0, im: 0 },  expI(Math.PI / 4),
        alpha, beta
      )
    case 'Rx':
      return applyMatrix(
        { re: Math.cos(th / 2), im: 0 },       { re: 0, im: -Math.sin(th / 2) },
        { re: 0, im: -Math.sin(th / 2) },       { re: Math.cos(th / 2), im: 0 },
        alpha, beta
      )
    case 'Ry':
      return applyMatrix(
        { re: Math.cos(th / 2), im: 0 },  { re: -Math.sin(th / 2), im: 0 },
        { re: Math.sin(th / 2), im: 0 },  { re: Math.cos(th / 2), im: 0 },
        alpha, beta
      )
    case 'Rz':
      return applyMatrix(
        expI(-th / 2),        { re: 0, im: 0 },
        { re: 0, im: 0 },     expI(th / 2),
        alpha, beta
      )
    default: {
      const _exhaustive: never = gate
      throw new Error(`Unknown gate: ${_exhaustive}`)
    }
  }
}

export function toBlochAngles(alpha: Complex, beta: Complex): { theta: number; phi: number } {
  const magAlpha = mag(alpha)
  const magBeta  = mag(beta)

  // Clamp theta (not periodic)
  const theta = 2 * Math.acos(Math.min(1, Math.max(0, magAlpha)))

  // Modular-normalize phi to [0, 2π] (periodic)
  let phi: number
  if (magAlpha < 1e-10) {
    // South pole |1⟩: phi is conventional, discard global phase
    phi = 0
  } else if (magBeta < 1e-10) {
    // North pole |0⟩
    phi = 0
  } else {
    const rawPhi = arg(beta) - arg(alpha)
    phi = ((rawPhi % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)
  }

  return { theta, phi }
}
