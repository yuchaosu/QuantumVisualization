// src/components/CircuitExplanation/circuitExplanationContent.ts
import type { CircuitGate } from '../../lib/tensorNetwork'

export type CircuitExplanationEntry = {
  title: string
  beginner: string
  matrix: string
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
