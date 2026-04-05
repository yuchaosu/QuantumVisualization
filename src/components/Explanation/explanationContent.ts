// src/components/Explanation/explanationContent.ts
import type { GateType } from '../../lib/quantum'

export type ExplanationEntry = {
  title: string
  beginner: string
  matrix: string    // KaTeX string
  deeper: string
}

const DEFAULT: ExplanationEntry = {
  title: 'What is a qubit?',
  beginner: 'A qubit is the basic unit of quantum information. Unlike a classical bit (always 0 or 1), a qubit can exist in a superposition — a combination of both states simultaneously. The Bloch sphere is a geometric representation of all possible single-qubit states. The north pole is |0⟩, the south pole is |1⟩, and points on the equator represent equal superpositions.',
  matrix: String.raw`\text{State: } |\psi\rangle = \alpha|0\rangle + \beta|1\rangle, \quad |\alpha|^2 + |\beta|^2 = 1`,
  deeper: 'Mathematically, a qubit state is a unit vector in a 2-dimensional complex Hilbert space ℂ². The Bloch sphere is a bijection between pure qubit states (up to global phase) and points on S² ⊂ ℝ³. The two degrees of freedom are the polar angle θ ∈ [0,π] and the azimuthal angle φ ∈ [0,2π].',
}

const GATES: Record<GateType, ExplanationEntry> = {
  H: {
    title: 'Hadamard Gate (H)',
    beginner: 'The Hadamard gate creates an equal superposition of |0⟩ and |1⟩. Think of it as flipping a perfectly balanced coin — the qubit becomes equally likely to be measured as 0 or 1. Applied to |0⟩, H produces |+⟩. Applied again, it returns to |0⟩.',
    matrix: String.raw`H = \frac{1}{\sqrt{2}}\begin{pmatrix}1 & 1 \\ 1 & -1\end{pmatrix}`,
    deeper: 'H is a rotation of π radians around the (X+Z)/√2 axis on the Bloch sphere. It maps |0⟩ ↔ |+⟩ and |1⟩ ↔ |−⟩. It is its own inverse: H² = I. H is the key gate for creating superposition.',
  },
  X: {
    title: 'Pauli-X Gate (X)',
    beginner: 'The X gate is the quantum equivalent of a classical NOT gate. It flips |0⟩ to |1⟩ and vice versa. On the Bloch sphere, it rotates the state vector 180° around the X-axis.',
    matrix: String.raw`X = \begin{pmatrix}0 & 1 \\ 1 & 0\end{pmatrix}`,
    deeper: 'X is a rotation of π around the X-axis of the Bloch sphere: Rx(π) up to global phase. As a Pauli matrix σ_x, it anti-commutes with Y and Z. X² = I.',
  },
  Y: {
    title: 'Pauli-Y Gate (Y)',
    beginner: 'The Y gate rotates the qubit state 180° around the Y-axis of the Bloch sphere. It flips the qubit like X, but also introduces a phase change.',
    matrix: String.raw`Y = \begin{pmatrix}0 & -i \\ i & 0\end{pmatrix}`,
    deeper: 'Y is a rotation of π around the Y-axis. As Pauli matrix σ_y, it anti-commutes with X and Z. Applied to |0⟩: Y|0⟩ = i|1⟩. Y² = I.',
  },
  Z: {
    title: 'Pauli-Z Gate (Z)',
    beginner: 'The Z gate leaves |0⟩ unchanged but flips the phase of |1⟩ to −|1⟩. On the Bloch sphere, it rotates 180° around the Z-axis. It has no visible effect on computational basis states but matters in superposition.',
    matrix: String.raw`Z = \begin{pmatrix}1 & 0 \\ 0 & -1\end{pmatrix}`,
    deeper: 'Z is a rotation of π around the Z-axis. It is the "phase flip" gate. Z = S² = T⁴. As Pauli matrix σ_z, it commutes with neither X nor Y. Z² = I.',
  },
  S: {
    title: 'S Gate (Phase Gate)',
    beginner: 'The S gate is a "quarter turn" around the Z-axis. It leaves |0⟩ unchanged and multiplies |1⟩ by i (a 90° phase rotation). Two S gates equal one Z gate.',
    matrix: String.raw`S = \begin{pmatrix}1 & 0 \\ 0 & i\end{pmatrix}`,
    deeper: 'S = Z^{1/2}. It introduces a phase of e^{iπ/2} = i on |1⟩. Together with H, it generates the Clifford group. S is not its own inverse: S† = S³ = Z·S.',
  },
  T: {
    title: 'T Gate (π/8 Gate)',
    beginner: 'The T gate is a smaller phase rotation than S — it rotates the |1⟩ component by 45°. It is important in quantum computing because, combined with H and CNOT, it can approximate any quantum operation (universality).',
    matrix: String.raw`T = \begin{pmatrix}1 & 0 \\ 0 & e^{i\pi/4}\end{pmatrix}`,
    deeper: 'T = Z^{1/4}. It introduces a phase of e^{iπ/4} on |1⟩. T is outside the Clifford group and enables universal quantum computation when added to {H, S, CNOT}. T² = S, T⁴ = Z, T⁸ = I.',
  },
  Rx: {
    title: 'Rx(θ) — X-axis Rotation',
    beginner: 'Rx(θ) rotates the qubit state by angle θ around the X-axis of the Bloch sphere. θ = π gives the X (NOT) gate. θ = π/2 creates an equal superposition (like H but around a different axis).',
    matrix: String.raw`R_x(\theta) = \begin{pmatrix}\cos\frac{\theta}{2} & -i\sin\frac{\theta}{2} \\ -i\sin\frac{\theta}{2} & \cos\frac{\theta}{2}\end{pmatrix}`,
    deeper: 'Rx(θ) = exp(−iθX/2) = I·cos(θ/2) − i·X·sin(θ/2). It traces a circular arc on the Bloch sphere in the YZ plane. Rx(π) = −iX, which equals X up to global phase.',
  },
  Ry: {
    title: 'Ry(θ) — Y-axis Rotation',
    beginner: 'Ry(θ) rotates the qubit state by angle θ around the Y-axis of the Bloch sphere. Unlike Rx/Rz, Ry has only real matrix entries, making it particularly useful for preparing real-amplitude states.',
    matrix: String.raw`R_y(\theta) = \begin{pmatrix}\cos\frac{\theta}{2} & -\sin\frac{\theta}{2} \\ \sin\frac{\theta}{2} & \cos\frac{\theta}{2}\end{pmatrix}`,
    deeper: 'Ry(θ) = exp(−iθY/2) = I·cos(θ/2) − i·Y·sin(θ/2). It is the only Pauli rotation with a purely real matrix, making it useful in variational quantum circuits. Ry(π) = −iY ≈ X up to global phase.',
  },
  Rz: {
    title: 'Rz(θ) — Z-axis Rotation',
    beginner: 'Rz(θ) rotates the qubit state around the Z-axis by angle θ. This corresponds to changing the azimuthal angle φ on the Bloch sphere without changing the polar angle θ — it rotates the "longitude" of the state.',
    matrix: String.raw`R_z(\theta) = \begin{pmatrix}e^{-i\theta/2} & 0 \\ 0 & e^{i\theta/2}\end{pmatrix}`,
    deeper: 'Rz(θ) = exp(−iθZ/2). It changes only the relative phase between |0⟩ and |1⟩ components. Rz(π) = −iZ ≈ Z. Rz(π/2) = −iS ≈ S. Rz is the canonical "phase rotation" used extensively in quantum Fourier transforms.',
  },
}

export function getExplanation(gate: GateType | null): ExplanationEntry {
  if (!gate) return DEFAULT
  return GATES[gate]
}
