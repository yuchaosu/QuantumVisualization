# Algorithm Page Design Spec

## Goal

A dedicated Algorithm page that teaches beginners five foundational quantum algorithms through guided, step-by-step walkthroughs. Each algorithm is pre-loaded as an editable circuit; a narration panel explains each gate in plain English, math, and deeper conceptual terms as the user steps through.

## Architecture

`AlgorithmPage` is a new top-level page activated by the existing "Algorithms" NavBar link (currently disabled). It reuses `CircuitGrid`, `TensorNetworkGraph`, and `TensorComponents` for visualization and the existing `circuitReducer` + `tensorNetwork.ts` for simulation — no new simulation logic is needed.

A new library file `src/lib/algorithms.ts` defines all five preset algorithms as static data: circuit gates + per-step narrations. The `contractionStep` from the existing reducer doubles as the walkthrough position.

**New files:**
- `src/lib/algorithms.ts` — algorithm data (circuits + step narrations)
- `src/components/AlgorithmPage/AlgorithmPage.tsx`
- `src/components/AlgorithmPage/AlgorithmPage.module.css`

**Unchanged:** `CircuitGrid`, `TensorNetworkGraph`, `TensorComponents`, `CircuitExplanation`

**Modified:**
- `src/lib/tensorNetwork.ts` — add `UNCONTRACT_STEP` and `SET_GATES` reducer actions
- `src/components/NavBar/NavBar.tsx` — widen `page` and `onNavigate` prop types to include `'algorithms'`
- `src/App.tsx` — widen `page` state type to `'bloch' | 'circuits' | 'algorithms'`; add `{page === 'algorithms' && <AlgorithmPage theme={theme} />}`

## Layout (top → bottom)

All sections `flex-shrink: 0` except the canvas.

1. **Algorithm selector bar** — `<select>` listing all five algorithms + one-line description of the selected algorithm + qubit count badge
2. **View tabs + input mode buttons** — same three tabs (Circuit / Tensor Network / Heatmap) and drag/builder/code mode buttons in the same row
3. **Canvas** (`flex: 1`, `min-height: 0`) — renders `CircuitGrid`, `TensorNetworkGraph`, or `TensorComponents` based on active tab
4. **Step controls bar** — ⏮ Reset · ← Prev · step label (`Step N / M — {step.label}`) · Next → · ▶ Play/⏸ Pause
5. **Bottom panels** (side by side):
   - **Narration** (60%) — Beginner / Math / Deeper tabs; KaTeX for math content; explains the current step
   - **Input panel** (40%) — gate palette, builder form, or code textarea depending on active input mode (identical to Circuits page)

## Data Model (`src/lib/algorithms.ts`)

```ts
type AlgorithmStep = {
  // Index into gates[] this narration applies to (0-based, position in flat array).
  // gateIndex === -1 means the intro step shown before any gate is applied (contractionStep === 0).
  // Narration is shown AFTER the gate at gateIndex is applied (i.e. when contractionStep === gateIndex + 1).
  gateIndex: number
  label: string       // e.g. "Apply Hadamard gates"
  beginner: string    // plain-English explanation
  math: string        // KaTeX string
  deeper: string      // geometric / conceptual insight
}

type Algorithm = {
  id: string
  name: string
  description: string       // one-line shown in selector bar
  numQubits: number
  gates: CircuitGate[]      // preset circuit
  steps: AlgorithmStep[]    // narration steps; first entry has gateIndex === -1 (intro)
}

export const ALGORITHMS: Algorithm[]
```

**Narration lookup:** `steps.find(s => s.gateIndex === contractionStep - 1) ?? steps[0]`
- At `contractionStep === 0` (no gates applied): show the intro step (`gateIndex === -1`) — an overview of what this algorithm does.
- At `contractionStep === k`: show the step for `gateIndex === k - 1` (explains the gate that was just applied).
- If the user edited the circuit and no matching step exists: fall back to `CircuitExplanation`'s generic gate description.

## Reducer Changes (`src/lib/tensorNetwork.ts`)

Two new actions added to `circuitReducer`:

### `SET_GATES`
Bulk-loads a preset circuit without touching `codeText`. Used when switching algorithms.
```ts
{ type: 'SET_GATES'; gates: CircuitGate[]; numQubits: number }
// Sets state.gates, state.numQubits, resets contractionStep to 0,
// recomputes amplitudes from getInitialState(numQubits)
```

### `UNCONTRACT_STEP`
Steps backward one gate, rewinding the amplitude state.
```ts
{ type: 'UNCONTRACT_STEP' }
// If contractionStep === 0: no-op.
// Otherwise: contractionStep -= 1.
// Recompute amplitudes by replaying gates[0..contractionStep-1] from getInitialState.
// This ensures the state vector is always consistent with the step counter.
```

The amplitude rewind is implemented as:
```ts
let amps = getInitialState(newNumQubits)
for (let i = 0; i < newContractionStep; i++) {
  amps = applyCircuitGate(gates[i], amps, newNumQubits)
}
```

All other existing actions (`CONTRACT_STEP`, `CONTRACT_ALL`, `RESET`, `APPLY_CODE`, etc.) are unchanged.

## Step Controls Behaviour

- **Next →** dispatches `CONTRACT_STEP` (existing)
- **← Prev** dispatches `UNCONTRACT_STEP` (new); disabled when `contractionStep === 0`
- **⏮ Reset** dispatches `SET_GATES` with the current algorithm's preset gates, resetting to step 0
- **▶ Play** auto-advances with `setInterval` every 800 ms dispatching `CONTRACT_STEP` until `contractionStep === gates.length`; button label flips to ⏸ Pause
- Switching algorithm via `<select>` dispatches `SET_GATES` with new algorithm's data

## The Five Algorithms

`gateIndex` values are 0-based positions in the flat `gates[]` array. The intro step always has `gateIndex: -1`.

All gates use the existing `CircuitGate` discriminated union:
- Single: `{ type: 'single', id, gate, qubit, step, angle? }`
- CNOT: `{ type: 'cnot', id, control, target, step }`
- SWAP: `{ type: 'swap', id, qubit0, qubit1, step }`

---

### 1. Deutsch–Jozsa (2 qubits)

**Problem:** Is f(x) constant (always 0 or 1) or balanced (half 0, half 1)?
**Quantum advantage:** 1 query vs. 2^(n-1)+1 classical queries.

**Preset circuit — balanced oracle (CNOT):**

| Array index | Gate | Qubit | Circuit step |
|-------------|------|-------|------|
| 0 | X | q1 | 0 |
| 1 | H | q0 | 1 |
| 2 | H | q1 | 1 |
| 3 | CNOT | control=q0, target=q1 | 2 |
| 4 | H | q0 | 3 |

**Narration steps:**

| gateIndex | label | beginner |
|-----------|-------|----------|
| -1 | Overview | Deutsch–Jozsa answers "is this function constant or balanced?" in one quantum query. Classically you'd need to check half the inputs — quantum parallelism lets us check all at once. |
| 0 | Initialize ancilla | X flips q1 to \|1⟩. This "ancilla" qubit absorbs the oracle's output through a trick called phase kickback. |
| 1 | Superpose q0 | H puts q0 in equal superposition: it now represents both 0 and 1 simultaneously. |
| 2 | Superpose ancilla | H on q1 (already \|1⟩) creates (\|0⟩−\|1⟩)/√2 — the special state that enables phase kickback. |
| 3 | Apply oracle | CNOT implements the balanced function. Phase kickback writes the answer into q0's phase without measuring anything. |
| 4 | Interference | H on q0 converts phase differences into amplitude differences. For a balanced function q0 collapses to \|1⟩; for a constant function it collapses to \|0⟩. Read the answer from q0. |

---

### 2. Bernstein–Vazirani (3 qubits)

**Problem:** Find hidden binary string s where f(x) = s·x mod 2.
**Quantum advantage:** 1 query vs. N classical queries.

**Preset circuit (s = "11", i.e. s₀=1, s₁=1):**

| Array index | Gate | Qubit(s) | Circuit step |
|-------------|------|----------|------|
| 0 | X | q2 | 0 |
| 1 | H | q0 | 1 |
| 2 | H | q1 | 1 |
| 3 | H | q2 | 1 |
| 4 | CNOT | control=q0, target=q2 | 2 |
| 5 | CNOT | control=q1, target=q2 | 3 |
| 6 | H | q0 | 4 |
| 7 | H | q1 | 4 |

**Narration steps (9 entries, gateIndex -1 through 7, one per gate plus intro):**

| gateIndex | label |
|-----------|-------|
| -1 | Overview — Bernstein–Vazirani finds a hidden binary string in 1 query |
| 0 | Initialize ancilla — X puts q2 in \|1⟩ for phase kickback |
| 1 | Superpose q0 — H creates equal superposition |
| 2 | Superpose q1 — H creates equal superposition |
| 3 | Superpose ancilla — H on \|1⟩ creates the (\|0⟩−\|1⟩)/√2 kickback state |
| 4 | Oracle: encode s₀ — CNOT(q0,q2) encodes the first bit of s |
| 5 | Oracle: encode s₁ — CNOT(q1,q2) encodes the second bit of s |
| 6 | Read q0 — H collapses q0 to the first bit of s |
| 7 | Read q1 — H collapses q1 to the second bit of s; measure q0,q1 to reveal s="11" |

---

### 3. Grover's Search (2 qubits)

**Problem:** Find the marked item \|11⟩ in an unsorted list of 4 items.
**Quantum advantage:** O(√N) vs. O(N) classical. One Grover iteration suffices for N=4.

**Key circuit design note:** CZ (controlled-Z, which marks \|11⟩ with a −1 phase) is decomposed as H(q1) · CNOT(q0→q1) · H(q1). The oracle and diffusion each contain one CZ.

**The diffusion closing H(q1) and oracle opening H(q1) do NOT cancel** — they are in separate logical phases. Gate index 4 (oracle's closing H on q1) is the end of the oracle. Gate index 5 (diffusion's opening H on q0) begins the diffusion on q0 only; gate index 6 is H on q1 for the diffusion. These are kept separate for clarity of narration.

**Preset circuit:**

| Array index | Gate | Qubit(s) | Circuit step | Phase |
|-------------|------|----------|------|-------|
| 0 | H | q0 | 0 | Init superposition |
| 1 | H | q1 | 0 | Init superposition |
| 2 | H | q1 | 1 | Oracle CZ start |
| 3 | CNOT | control=q0, target=q1 | 2 | Oracle CZ |
| 4 | H | q1 | 3 | Oracle CZ end |
| 5 | H | q0 | 4 | Diffusion start |
| 6 | H | q1 | 4 | Diffusion start |
| 7 | X | q0 | 5 | Diffusion: reflect |
| 8 | X | q1 | 5 | Diffusion: reflect |
| 9 | H | q1 | 6 | Diffusion CZ start |
| 10 | CNOT | control=q0, target=q1 | 7 | Diffusion CZ |
| 11 | H | q1 | 8 | Diffusion CZ end |
| 12 | X | q0 | 9 | Diffusion: un-reflect |
| 13 | X | q1 | 9 | Diffusion: un-reflect |
| 14 | H | q0 | 10 | Diffusion end |
| 15 | H | q1 | 10 | Diffusion end |

**Narration steps:** Overview → Superposition → Oracle (mark \|11⟩) → Diffusion (amplify \|11⟩) → Final state (\|11⟩ amplitude ≈ 1)

---

### 4. Quantum Teleportation (3 qubits)

**Problem:** Transfer q0's unknown state to q2 using entanglement + 2 classical bits.
**Key insight:** No faster-than-light communication; the classical correction is always applied in simulation.

**Preset circuit:**

| Array index | Gate | Qubit(s) | Circuit step |
|-------------|------|----------|------|
| 0 | H | q0 | 0 | Prepare q0 in \|+⟩ (demo state) |
| 1 | H | q1 | 1 | Bell pair start |
| 2 | CNOT | control=q1, target=q2 | 2 | Bell pair end |
| 3 | CNOT | control=q0, target=q1 | 3 | Entangle q0 with Bell pair |
| 4 | H | q0 | 4 | Prepare to measure q0 |
| 5 | X | q2 | 5 | Classically-controlled correction (always applied in simulation) |
| 6 | Z | q2 | 6 | Classically-controlled correction |

**Narration steps:** Overview → Prepare q0 → Create Bell pair (q1,q2) → Entangle q0 → Measure basis change → Apply X correction → Apply Z correction (q2 now holds original q0 state)

---

### 5. Quantum Fourier Transform (3 qubits)

**Problem:** Compute the discrete Fourier transform of the quantum state amplitudes.
**Quantum advantage:** O(n²) gates vs. O(n·2^n) for classical FFT on this state representation.

**Gate set note:** Controlled-phase gates CS (phase π/2) and CT (phase π/4) are not native. Each is decomposed into 5 gates using the correct CP(θ) decomposition:

> CP(θ, control=a, target=b) = Rz(θ/2) on a · CNOT(a,b) · Rz(-θ/2) on b · CNOT(a,b) · Rz(θ/2) on b

- CS: θ=π/2 → angles Rz(π/4), Rz(-π/4), Rz(π/4)
- CT: θ=π/4 → angles Rz(π/8), Rz(-π/8), Rz(π/8)

This decomposition was verified against the Phase-gate identity: each basis state |00⟩,|01⟩,|10⟩,|11⟩ acquires the correct relative phase. Using Rz instead of the phase gate P introduces an irrelevant global phase per qubit — probabilities and relative phases between basis states are correct.

**Intermediate-step narration policy:** Only the milestone gates (H gates and the first Rz of each CS/CT block) have explicit `AlgorithmStep` entries. Gates within a CS/CT decomposition that have no matching `gateIndex` fall back to `CircuitExplanation`'s generic gate description. This keeps narration steps to ~8 for readability.

**Preset circuit (16 gates, indices 0–15):**

| Array index | Gate | Qubit(s) | Angle | Circuit step | Block |
|-------------|------|----------|-------|------|-------|
| 0 | H | q0 | — | 0 | QFT on q0 |
| 1 | Rz | q1 | π/4 | 1 | CS(q1→q0) — Rz on control |
| 2 | CNOT | control=q1, target=q0 | — | 2 | |
| 3 | Rz | q0 | -π/4 | 3 | — Rz on target |
| 4 | CNOT | control=q1, target=q0 | — | 4 | |
| 5 | Rz | q0 | π/4 | 5 | — final Rz on target |
| 6 | Rz | q2 | π/8 | 6 | CT(q2→q0) — Rz on control |
| 7 | CNOT | control=q2, target=q0 | — | 7 | |
| 8 | Rz | q0 | -π/8 | 8 | — Rz on target |
| 9 | CNOT | control=q2, target=q0 | — | 9 | |
| 10 | Rz | q0 | π/8 | 10 | — final Rz on target |
| 11 | H | q1 | — | 11 | QFT on q1 |
| 12 | Rz | q2 | π/4 | 12 | CS(q2→q1) — Rz on control |
| 13 | CNOT | control=q2, target=q1 | — | 13 | |
| 14 | Rz | q1 | -π/4 | 14 | — Rz on target |
| 15 | CNOT | control=q2, target=q1 | — | 15 | |
| 16 | Rz | q1 | π/4 | 16 | — final Rz on target |
| 17 | H | q2 | — | 17 | QFT on q2 |
| 18 | SWAP | q0, q2 | — | 18 | Bit-reversal |

**Narration steps (milestone gateIndex entries: -1, 0, 1, 6, 11, 12, 17, 18):**
Overview → H on q0 → CS(q1,q0) phase rotation → CT(q2,q0) phase rotation → H on q1 → CS(q2,q1) → H on q2 → Bit-reversal swap

---

## State & Local Component State

`AlgorithmPage` manages its own local React state:
- `selectedAlgorithmId: string` (default: `'deutsch-jozsa'`)
- `canvasView: 'circuit' | 'tensor' | 'heatmap'`
- `inputMode: 'drag' | 'builder' | 'code'`
- `narrationTab: 'beginner' | 'math' | 'deeper'`
- `isPlaying: boolean`
- Circuit state via `useReducer(circuitReducer, initialCircuitState)`

## NavBar & App.tsx Changes

**NavBar.tsx:** Widen `Props` so `page: 'bloch' | 'circuits' | 'algorithms'` and `onNavigate: (page: 'bloch' | 'circuits' | 'algorithms') => void`. Remove `linkDisabled` from the Algorithms link; wire it to `onNavigate('algorithms')`.

**App.tsx:** Widen `page` state type to `'bloch' | 'circuits' | 'algorithms'`. Add `{page === 'algorithms' && <AlgorithmPage theme={theme} />}`.

## Testing

**`tests/lib/algorithms.test.ts`**
- For each algorithm: apply full circuit to `getInitialState(numQubits)` and verify expected final state:
  - Deutsch–Jozsa: q0 amplitude at index with q0=1 ≈ 1.0 (balanced oracle)
  - Bernstein–Vazirani: q0=1, q1=1 basis state has probability ≈ 1.0
  - Grover: \|11⟩ (index 3) probability ≈ 1.0
  - Teleportation: q2 amplitude matches q0's initial state
  - QFT: verify a known input (e.g. \|000⟩) produces uniform amplitudes with correct phases

**`tests/lib/tensorNetwork.test.ts`** (extend existing)
- `UNCONTRACT_STEP` at step 0: no-op
- `UNCONTRACT_STEP` after 2 steps: state vector matches applying only first gate from scratch
- `SET_GATES`: resets contractionStep to 0, amplitudes = getInitialState

## CSS

Follows existing patterns: `--bg-surface`, `--bg-base`, `--accent-blue`, `--font-mono`, same button and panel styles as `CircuitPage.module.css`.
