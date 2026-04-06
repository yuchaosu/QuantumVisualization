// src/lib/algorithms.ts
import type { CircuitGate } from './tensorNetwork'

export type AlgorithmStep = {
  gateIndex: number   // -1 = intro (shown at contractionStep 0)
  label: string
  beginner: string
  math: string        // KaTeX string
  deeper: string
}

export type Algorithm = {
  id: string
  name: string
  description: string
  numQubits: number
  gates: CircuitGate[]
  steps: AlgorithmStep[]
}

// ─── 1. Deutsch–Jozsa (2 qubits, balanced oracle) ────────────────────────────

const deutschJozsa: Algorithm = {
  id: 'deutsch-jozsa',
  name: 'Deutsch–Jozsa',
  description: 'Is this function constant or balanced? Solved in one quantum query.',
  numQubits: 2,
  gates: [
    { id:'dj-0', type:'single', gate:'X',    qubit:1, step:0 },
    { id:'dj-1', type:'single', gate:'H',    qubit:0, step:1 },
    { id:'dj-2', type:'single', gate:'H',    qubit:1, step:1 },
    { id:'dj-3', type:'cnot',   control:0,   target:1, step:2 },
    { id:'dj-4', type:'single', gate:'H',    qubit:0, step:3 },
  ],
  steps: [
    {
      gateIndex: -1,
      label: 'Overview',
      beginner: 'Deutsch–Jozsa answers "is this function constant or balanced?" in one quantum query. Classically you need to check half the inputs — quantum parallelism lets us check all at once.',
      math: 'f:\\{0,1\\}^n \\to \\{0,1\\}',
      deeper: 'The algorithm exploits quantum interference: amplitudes for "constant" cancel when the answer is "balanced", and vice versa. This is the simplest proof that quantum computers can be exponentially more efficient than classical ones for certain problems.',
    },
    {
      gateIndex: 0,
      label: 'Initialize ancilla',
      beginner: 'X flips q1 to |1⟩. This "ancilla" qubit absorbs the oracle\'s output through a trick called phase kickback.',
      math: 'X|0\\rangle = |1\\rangle',
      deeper: 'The ancilla starts in |1⟩ so that after the Hadamard it becomes (|0⟩−|1⟩)/√2. This antisymmetric state is the key to phase kickback — applying the oracle flips the sign of the control qubit\'s amplitude instead of changing the ancilla.',
    },
    {
      gateIndex: 1,
      label: 'Superpose query qubit',
      beginner: 'H puts q0 in equal superposition: it now represents both 0 and 1 simultaneously.',
      math: 'H|0\\rangle = \\frac{|0\\rangle + |1\\rangle}{\\sqrt{2}}',
      deeper: 'This creates the uniform superposition needed to query the oracle on all inputs at once. In the Hadamard basis, a constant function has no phase difference between inputs; a balanced function has exactly opposite phases.',
    },
    {
      gateIndex: 2,
      label: 'Superpose ancilla',
      beginner: 'H on q1 (already |1⟩) creates (|0⟩−|1⟩)/√2 — the special state that enables phase kickback.',
      math: 'H|1\\rangle = \\frac{|0\\rangle - |1\\rangle}{\\sqrt{2}}',
      deeper: 'The minus sign here is crucial. When the oracle computes f(x), it XORs the result into the ancilla. Because the ancilla is in this antisymmetric state, the XOR shows up as a phase ±1 on q0 instead — this is phase kickback.',
    },
    {
      gateIndex: 3,
      label: 'Apply oracle',
      beginner: 'CNOT implements the balanced function. Phase kickback writes the answer into q0\'s phase without measuring anything.',
      math: 'U_f|x\\rangle\\frac{|0\\rangle-|1\\rangle}{\\sqrt{2}} = (-1)^{f(x)}|x\\rangle\\frac{|0\\rangle-|1\\rangle}{\\sqrt{2}}',
      deeper: 'After the oracle, q0 picks up a phase of −1 whenever f(x)=1. For the balanced CNOT oracle, this flips the sign of the |1⟩ component of q0, creating the state (|0⟩−|1⟩)/√2 on q0.',
    },
    {
      gateIndex: 4,
      label: 'Interference — read the answer',
      beginner: 'H on q0 converts phase differences into amplitude differences. For a balanced function q0 collapses to |1⟩; for a constant function it collapses to |0⟩.',
      math: 'H\\frac{|0\\rangle - |1\\rangle}{\\sqrt{2}} = |1\\rangle',
      deeper: 'The Hadamard acts as a Fourier transform on one bit. It maps (|0⟩−|1⟩)/√2 → |1⟩ and (|0⟩+|1⟩)/√2 → |0⟩. Measuring q0 in the computational basis collapses to |1⟩ (balanced) or |0⟩ (constant) with certainty.',
    },
  ],
}

// ─── 2. Bernstein–Vazirani (3 qubits, s="11") ────────────────────────────────

const bernsteinVazirani: Algorithm = {
  id: 'bernstein-vazirani',
  name: 'Bernstein–Vazirani',
  description: 'Find the hidden binary string s in one query (classically needs N queries).',
  numQubits: 3,
  gates: [
    { id:'bv-0', type:'single', gate:'X', qubit:2, step:0 },
    { id:'bv-1', type:'single', gate:'H', qubit:0, step:1 },
    { id:'bv-2', type:'single', gate:'H', qubit:1, step:1 },
    { id:'bv-3', type:'single', gate:'H', qubit:2, step:1 },
    { id:'bv-4', type:'cnot',   control:0, target:2, step:2 },
    { id:'bv-5', type:'cnot',   control:1, target:2, step:3 },
    { id:'bv-6', type:'single', gate:'H', qubit:0, step:4 },
    { id:'bv-7', type:'single', gate:'H', qubit:1, step:4 },
  ],
  steps: [
    {
      gateIndex: -1,
      label: 'Overview',
      beginner: 'Bernstein–Vazirani finds a hidden binary string s where f(x) = s·x mod 2. Classically you need N separate queries (one per bit). Quantum: 1 query reveals all bits simultaneously.',
      math: 'f(x) = s \\cdot x \\mod 2',
      deeper: 'The algorithm is structurally identical to Deutsch–Jozsa but encodes more information. The oracle computes the inner product of x with the secret string s, and phase kickback reveals all bits of s in a single pass.',
    },
    {
      gateIndex: 0,
      label: 'Initialize ancilla',
      beginner: 'X flips q2 to |1⟩ to prepare for phase kickback.',
      math: 'X|0\\rangle = |1\\rangle',
      deeper: 'Same ancilla trick as Deutsch–Jozsa: q2 will be put in (|0⟩−|1⟩)/√2 and used to convert oracle outputs into phases on the input qubits.',
    },
    {
      gateIndex: 1,
      label: 'Superpose q0',
      beginner: 'H puts q0 in superposition so it queries both 0 and 1 at the same time.',
      math: 'H|0\\rangle = \\frac{|0\\rangle + |1\\rangle}{\\sqrt{2}}',
      deeper: 'Each input qubit is independently superposed. The full query register becomes a uniform superposition of all 2ⁿ bit strings simultaneously.',
    },
    {
      gateIndex: 2,
      label: 'Superpose q1',
      beginner: 'H puts q1 in superposition — same as q0.',
      math: 'H|0\\rangle = \\frac{|0\\rangle + |1\\rangle}{\\sqrt{2}}',
      deeper: 'After H on both q0 and q1, the query register is (|00⟩+|01⟩+|10⟩+|11⟩)/2 — querying all 4 input combinations in parallel.',
    },
    {
      gateIndex: 3,
      label: 'Superpose ancilla',
      beginner: 'H on q2 (already |1⟩) prepares the phase kickback state.',
      math: 'H|1\\rangle = \\frac{|0\\rangle - |1\\rangle}{\\sqrt{2}}',
      deeper: 'The ancilla is now ready to convert each oracle output into a ±1 phase on the corresponding input qubit.',
    },
    {
      gateIndex: 4,
      label: 'Oracle: encode s₀=1',
      beginner: 'CNOT(q0→q2) encodes the first bit of s. Since s₀=1, q0 is connected to the oracle.',
      math: 'f(x_0, x_1) \\mathrel{+}= x_0 \\cdot s_0',
      deeper: 'Phase kickback from CNOT(q0,q2): when q0=1, the CNOT flips q2, which (in the (|0⟩−|1⟩)/√2 basis) shows up as a −1 phase on the |1⟩ component of q0. Net effect: q0 picks up phase (−1)^{x₀·s₀}.',
    },
    {
      gateIndex: 5,
      label: 'Oracle: encode s₁=1',
      beginner: 'CNOT(q1→q2) encodes the second bit of s. Since s₁=1, q1 is also connected.',
      math: 'f(x_0, x_1) \\mathrel{+}= x_1 \\cdot s_1',
      deeper: 'After both CNOTs, q0 carries phase (−1)^{x₀} and q1 carries phase (−1)^{x₁}. The full state is a product state encoding s in the phases.',
    },
    {
      gateIndex: 6,
      label: 'Read q0',
      beginner: 'H collapses q0 to the first bit of s. Since s₀=1, q0 is now in |1⟩.',
      math: 'H\\frac{|0\\rangle - |1\\rangle}{\\sqrt{2}} = |1\\rangle',
      deeper: 'H maps (−1)^s·|s⟩ back to the computational basis. The phase encodes which basis state has amplitude 1 — exactly s.',
    },
    {
      gateIndex: 7,
      label: 'Read q1 — answer revealed',
      beginner: 'H collapses q1 to the second bit of s. Measuring q0,q1 gives "11" = the hidden string s.',
      math: 'H\\frac{|0\\rangle - |1\\rangle}{\\sqrt{2}} = |1\\rangle',
      deeper: 'Both bits of s are revealed simultaneously in a single oracle query. Classically, recovering n-bit s requires n queries; this algorithm always uses exactly 1.',
    },
  ],
}

// ─── 3. Grover's Search (2 qubits, marked state |11⟩) ────────────────────────

const grover: Algorithm = {
  id: 'grover',
  name: "Grover's Search",
  description: 'Find the marked item |11⟩ in O(√N) steps instead of O(N).',
  numQubits: 2,
  gates: [
    // Superposition
    { id:'gr-0',  type:'single', gate:'H', qubit:0, step:0 },
    { id:'gr-1',  type:'single', gate:'H', qubit:1, step:0 },
    // Oracle: CZ marks |11⟩ with −1 phase via H·CNOT·H
    { id:'gr-2',  type:'single', gate:'H', qubit:1, step:1 },
    { id:'gr-3',  type:'cnot',   control:0, target:1, step:2 },
    { id:'gr-4',  type:'single', gate:'H', qubit:1, step:3 },
    // Diffusion operator: H⊗H · X⊗X · CZ · X⊗X · H⊗H
    { id:'gr-5',  type:'single', gate:'H', qubit:0, step:4 },
    { id:'gr-6',  type:'single', gate:'H', qubit:1, step:4 },
    { id:'gr-7',  type:'single', gate:'X', qubit:0, step:5 },
    { id:'gr-8',  type:'single', gate:'X', qubit:1, step:5 },
    { id:'gr-9',  type:'single', gate:'H', qubit:1, step:6 },
    { id:'gr-10', type:'cnot',   control:0, target:1, step:7 },
    { id:'gr-11', type:'single', gate:'H', qubit:1, step:8 },
    { id:'gr-12', type:'single', gate:'X', qubit:0, step:9 },
    { id:'gr-13', type:'single', gate:'X', qubit:1, step:9 },
    { id:'gr-14', type:'single', gate:'H', qubit:0, step:10 },
    { id:'gr-15', type:'single', gate:'H', qubit:1, step:10 },
  ],
  steps: [
    {
      gateIndex: -1,
      label: 'Overview',
      beginner: "Grover's algorithm finds the one marked item in an unsorted list of N items using only √N steps. Here N=4 and we're searching for |11⟩. One iteration is enough for N=4.",
      math: 'O(\\sqrt{N}) \\text{ vs classical } O(N)',
      deeper: 'The algorithm works by repeatedly amplifying the amplitude of the marked state while suppressing others. After √N iterations, measuring the system yields the marked item with near-certainty.',
    },
    {
      gateIndex: 1,
      label: 'Create superposition',
      beginner: 'H on both qubits puts the system in an equal superposition of all 4 states — like shining a flashlight on all possibilities at once.',
      math: 'H^{\\otimes 2}|00\\rangle = \\frac{1}{2}(|00\\rangle+|01\\rangle+|10\\rangle+|11\\rangle)',
      deeper: 'Each basis state starts with amplitude 1/2. The oracle will flip the sign of the marked state; the diffusion operator then amplifies it. Starting from uniform superposition ensures all states are equally "visible" to the oracle.',
    },
    {
      gateIndex: 4,
      label: 'Oracle marks |11⟩',
      beginner: 'The oracle (H·CNOT·H) flips the sign of |11⟩ while leaving all other states unchanged. This is like circling the answer on a multiple-choice test.',
      math: '|11\\rangle \\to -|11\\rangle',
      deeper: 'H·CNOT·H on q1 (with q0 as control) implements a controlled-Z gate, which applies −1 phase to |11⟩ only. The other amplitudes are unchanged — the oracle can\'t "see" which state it marked from outside.',
    },
    {
      gateIndex: 11,
      label: 'Diffusion amplifies |11⟩',
      beginner: 'The diffusion operator (H·X·CZ·X·H) boosts the amplitude of the marked state and shrinks the others. After one iteration, |11⟩ has amplitude ≈ 1.',
      math: '2|s\\rangle\\langle s| - I \\quad \\text{where } |s\\rangle = \\frac{1}{2}\\sum_x |x\\rangle',
      deeper: 'The diffusion is a reflection about the uniform superposition state |s⟩. Combined with the oracle (reflection about everything except the marked state), one iteration of Grover\'s is a rotation in the 2D subspace spanned by |marked⟩ and |rest⟩.',
    },
    {
      gateIndex: 15,
      label: 'Measure — find the answer',
      beginner: 'After one Grover iteration for N=4, |11⟩ has probability exactly 1. Measuring q0 and q1 always gives "11".',
      math: 'P(|11\\rangle) = 1',
      deeper: 'For N=4, one iteration rotates the state vector exactly onto the marked state. For larger N, you need ⌊π√N/4⌋ iterations to get close — measuring too early or too late reduces success probability.',
    },
  ],
}

// ─── 4. Quantum Teleportation (3 qubits) ─────────────────────────────────────

const teleportation: Algorithm = {
  id: 'teleportation',
  name: 'Quantum Teleportation',
  description: 'Transfer a qubit\'s state using entanglement + 2 classical bits.',
  numQubits: 3,
  gates: [
    { id:'tp-0', type:'single', gate:'H', qubit:0, step:0 }, // Prepare q0 in |+⟩
    { id:'tp-1', type:'single', gate:'H', qubit:1, step:1 }, // Bell pair start
    { id:'tp-2', type:'cnot',   control:1, target:2, step:2 }, // Bell pair end
    { id:'tp-3', type:'cnot',   control:0, target:1, step:3 }, // Entangle q0
    { id:'tp-4', type:'single', gate:'H', qubit:0, step:4 }, // Measure basis
    { id:'tp-5', type:'single', gate:'X', qubit:2, step:5 }, // Classical correction
    { id:'tp-6', type:'single', gate:'Z', qubit:2, step:6 }, // Classical correction
  ],
  steps: [
    {
      gateIndex: -1,
      label: 'Overview',
      beginner: 'Quantum teleportation transfers the exact quantum state of q0 to q2 using an entangled pair. No quantum information travels faster than light — 2 classical bits are also needed.',
      math: '|\\psi\\rangle_{q0} \\to |\\psi\\rangle_{q2}',
      deeper: 'Teleportation is not faster-than-light communication: the receiver needs the 2 classical bits before they can reconstruct the state. It destroys the original state (no-cloning theorem) and recreates it at the destination.',
    },
    {
      gateIndex: 0,
      label: 'Prepare q0',
      beginner: 'H puts q0 in |+⟩ = (|0⟩+|1⟩)/√2. This is the state we will teleport to q2.',
      math: '|\\psi\\rangle = H|0\\rangle = \\frac{|0\\rangle + |1\\rangle}{\\sqrt{2}}',
      deeper: 'In a real application, q0 would hold an arbitrary unknown state |ψ⟩ = α|0⟩+β|1⟩. We use |+⟩ here as a concrete example; the protocol works for any state.',
    },
    {
      gateIndex: 1,
      label: 'Create Bell pair',
      beginner: 'H on q1 starts creating a maximally entangled pair between q1 and q2 — the "quantum channel" for teleportation.',
      math: 'H|0\\rangle_1 = \\frac{|0\\rangle_1 + |1\\rangle_1}{\\sqrt{2}}',
      deeper: 'q1 and q2 must be prepared in a Bell state |Φ⁺⟩ = (|00⟩+|11⟩)/√2 before the protocol begins. This entanglement is the resource that enables teleportation.',
    },
    {
      gateIndex: 2,
      label: 'Complete Bell pair',
      beginner: 'CNOT(q1→q2) completes the entanglement. q1 and q2 are now in a Bell state — measuring one instantly determines the other.',
      math: '|\\Phi^+\\rangle = \\frac{|00\\rangle + |11\\rangle}{\\sqrt{2}}',
      deeper: 'The Bell state |Φ⁺⟩ is the resource consumed by teleportation. Alice (who has q0 and q1) and Bob (who has q2) can be far apart; the entanglement was pre-shared.',
    },
    {
      gateIndex: 3,
      label: 'Entangle q0 with Bell pair',
      beginner: 'CNOT(q0→q1) entangles the state-to-be-teleported (q0) with the shared Bell pair.',
      math: '\\text{CNOT}_{01}|\\psi\\rangle_0|\\Phi^+\\rangle_{12}',
      deeper: 'This step "touches" q0 to the channel without directly measuring it. The entanglement spreads q0\'s information across all three qubits, setting up the interference that teleportation exploits.',
    },
    {
      gateIndex: 4,
      label: 'Measure q0 (basis change)',
      beginner: 'H on q0 rotates to the measurement basis. After this, measuring q0 and q1 gives 2 classical bits that Bob uses to reconstruct the state.',
      math: 'H_0 \\cdot \\text{CNOT}_{01}: \\text{Bell measurement}',
      deeper: 'Together, CNOT(q0,q1) and H(q0) implement a "Bell measurement" — a measurement in the Bell basis instead of the computational basis. The 4 possible outcomes each tell Bob which of X, Z, XZ, or I to apply.',
    },
    {
      gateIndex: 5,
      label: 'Apply X correction',
      beginner: 'Based on the classical measurement result, Bob applies X to q2. In this simulation the correction is always applied.',
      math: 'X_{q2} \\text{ if } m_1 = 1',
      deeper: 'In the simulation we always apply both corrections (as if both measurement bits were 1). For |+⟩ this happens to give the right answer; a full implementation would branch on the 2-bit measurement outcome.',
    },
    {
      gateIndex: 6,
      label: 'Apply Z correction — teleportation complete',
      beginner: 'Z correction completes the teleportation. q2 is now in the same state q0 started in: |+⟩ = (|0⟩+|1⟩)/√2.',
      math: 'Z_{q2} \\text{ if } m_0 = 1',
      deeper: 'After both corrections, q2 holds exactly the original state of q0. The original q0 is now in an undetermined state (its information has moved). This is consistent with the no-cloning theorem — the state was moved, not copied.',
    },
  ],
}

// ─── 5. Quantum Fourier Transform (3 qubits) ─────────────────────────────────
// CS and CT decomposed via CP(θ) = Rz(θ/2)_a · CNOT(a,b) · Rz(-θ/2)_b · CNOT(a,b) · Rz(θ/2)_b

const qft: Algorithm = {
  id: 'qft',
  name: 'Quantum Fourier Transform',
  description: 'Compute the quantum Fourier transform in O(n²) gates vs O(n·2ⁿ) classically.',
  numQubits: 3,
  gates: [
    // QFT on q0
    { id:'qft-0',  type:'single', gate:'H',  qubit:0, step:0 },
    // CS(q1→q0): CP(π/2), angles π/4
    { id:'qft-1',  type:'single', gate:'Rz', qubit:1, step:1,  angle: Math.PI/4 },
    { id:'qft-2',  type:'cnot',   control:1, target:0, step:2 },
    { id:'qft-3',  type:'single', gate:'Rz', qubit:0, step:3,  angle: -Math.PI/4 },
    { id:'qft-4',  type:'cnot',   control:1, target:0, step:4 },
    { id:'qft-5',  type:'single', gate:'Rz', qubit:0, step:5,  angle: Math.PI/4 },
    // CT(q2→q0): CP(π/4), angles π/8
    { id:'qft-6',  type:'single', gate:'Rz', qubit:2, step:6,  angle: Math.PI/8 },
    { id:'qft-7',  type:'cnot',   control:2, target:0, step:7 },
    { id:'qft-8',  type:'single', gate:'Rz', qubit:0, step:8,  angle: -Math.PI/8 },
    { id:'qft-9',  type:'cnot',   control:2, target:0, step:9 },
    { id:'qft-10', type:'single', gate:'Rz', qubit:0, step:10, angle: Math.PI/8 },
    // QFT on q1
    { id:'qft-11', type:'single', gate:'H',  qubit:1, step:11 },
    // CS(q2→q1): CP(π/2), angles π/4
    { id:'qft-12', type:'single', gate:'Rz', qubit:2, step:12, angle: Math.PI/4 },
    { id:'qft-13', type:'cnot',   control:2, target:1, step:13 },
    { id:'qft-14', type:'single', gate:'Rz', qubit:1, step:14, angle: -Math.PI/4 },
    { id:'qft-15', type:'cnot',   control:2, target:1, step:15 },
    { id:'qft-16', type:'single', gate:'Rz', qubit:1, step:16, angle: Math.PI/4 },
    // QFT on q2
    { id:'qft-17', type:'single', gate:'H',  qubit:2, step:17 },
    // Bit-reversal swap
    { id:'qft-18', type:'swap',   qubit0:0,  qubit1:2, step:18 },
  ],
  steps: [
    {
      gateIndex: -1,
      label: 'Overview',
      beginner: 'The Quantum Fourier Transform (QFT) is the quantum version of the Fast Fourier Transform. It changes the "basis" of the quantum state — converting amplitudes from the position basis to the frequency basis. It\'s the key subroutine in Shor\'s factoring algorithm.',
      math: 'QFT|j\\rangle = \\frac{1}{\\sqrt{N}}\\sum_{k=0}^{N-1} e^{2\\pi i jk/N}|k\\rangle',
      deeper: 'The QFT uses O(n²) gates for n qubits, versus O(n·2ⁿ) operations for the classical FFT on the same 2ⁿ-element vector. The exponential advantage comes from the fact that the quantum state encodes all 2ⁿ amplitudes simultaneously.',
    },
    {
      gateIndex: 0,
      label: 'H on q0',
      beginner: 'H on q0 is the first step of the QFT: it creates a superposition that encodes the Fourier frequencies for the most significant bit.',
      math: 'H = \\frac{1}{\\sqrt{2}}\\begin{pmatrix}1&1\\\\1&-1\\end{pmatrix}',
      deeper: 'In the QFT, each qubit gets a Hadamard followed by controlled phase rotations from lower-order qubits. The phase rotations become finer as you move to less significant qubits, creating the complex Fourier exponentials.',
    },
    {
      gateIndex: 1,
      label: 'CS(q1→q0) — π/2 phase rotation',
      beginner: 'This 5-gate block applies a controlled phase of π/2 between q1 and q0. It fine-tunes the Fourier coefficients using information from q1.',
      math: 'CP(\\pi/2) = \\begin{pmatrix}1&0&0&0\\\\0&1&0&0\\\\0&0&1&0\\\\0&0&0&i\\end{pmatrix}',
      deeper: 'CP(π/2) adds phase i to |11⟩ while leaving other basis states unchanged. Decomposed as Rz(π/4)_a · CNOT(a,b) · Rz(-π/4)_b · CNOT(a,b) · Rz(π/4)_b using only available gates.',
    },
    {
      gateIndex: 6,
      label: 'CT(q2→q0) — π/4 phase rotation',
      beginner: 'An even finer phase rotation (π/4) from q2 to q0. The QFT needs increasingly precise phases from less significant qubits.',
      math: 'CP(\\pi/4)|11\\rangle = e^{i\\pi/4}|11\\rangle',
      deeper: 'Each additional qubit contributes a phase rotation half as large as the previous one: π/2, π/4, π/8, … This geometric series of phases is precisely what creates the discrete Fourier transform.',
    },
    {
      gateIndex: 11,
      label: 'H on q1',
      beginner: 'H on q1 starts the QFT for the middle qubit, same pattern as q0.',
      math: 'H|j_1\\rangle \\to \\frac{|0\\rangle + e^{i\\pi j_1}|1\\rangle}{\\sqrt{2}}',
      deeper: 'The QFT circuit has a self-similar structure: apply H, then controlled phases from remaining qubits, then recurse on the rest. This log-depth structure is what gives the O(n²) gate count.',
    },
    {
      gateIndex: 12,
      label: 'CS(q2→q1) — π/2 phase rotation',
      beginner: 'Phase rotation from q2 to q1, completing the QFT for the middle qubit.',
      math: 'CP(\\pi/2)_{q2 \\to q1}',
      deeper: 'After this block, q1\'s amplitude encodes the correct Fourier coefficient for the second-most-significant bit position.',
    },
    {
      gateIndex: 17,
      label: 'H on q2',
      beginner: 'H on q2 applies the QFT to the last qubit. No further phase rotations are needed after this.',
      math: 'H|j_2\\rangle \\to \\frac{|0\\rangle + e^{i\\pi j_2}|1\\rangle}{\\sqrt{2}}',
      deeper: 'The least significant qubit only needs a Hadamard — it has no less-significant qubits to receive phases from.',
    },
    {
      gateIndex: 18,
      label: 'Bit-reversal swap',
      beginner: 'SWAP(q0,q2) reverses the bit order of the output. The QFT circuit naturally produces the result in reversed bit order, so this swap corrects it.',
      math: '\\text{SWAP}_{02}: |q_0 q_1 q_2\\rangle \\to |q_2 q_1 q_0\\rangle',
      deeper: 'The bit-reversal is a well-known artifact of the standard QFT circuit construction. It can be omitted if the downstream algorithm accounts for the reversed ordering (as Shor\'s algorithm sometimes does).',
    },
  ],
}

// ─── Export ───────────────────────────────────────────────────────────────────

export const ALGORITHMS: Algorithm[] = [
  deutschJozsa,
  bernsteinVazirani,
  grover,
  teleportation,
  qft,
]

export function getAlgorithmById(id: string): Algorithm {
  const algo = ALGORITHMS.find(a => a.id === id)
  if (!algo) throw new Error(`Unknown algorithm id: ${id}`)
  return algo
}
