# Circuits & Tensor Contraction Page — Design Spec

## Overview

A new "Circuits" page added to QuantumVisualization that lets users build arbitrary n-qubit quantum circuits and visualize them simultaneously as a **Circuit Grid** (traditional wire/gate diagram), a **Tensor Network Graph** (nodes and edges), and a **Tensor Components** view (state amplitude heatmap or sparse list). The page activates the currently-disabled "Circuits" NavBar link.

---

## Problem Statement

The Bloch Sphere page handles only single-qubit states. Multi-qubit systems require a different mental model — quantum circuits and their underlying tensor network representation. This page bridges that gap by showing the same circuit in three complementary views, all staying in sync.

---

## Layout (Layout A — Circuit on Top)

```
┌─────────────────────────────────────────┐
│ NavBar: Bloch Sphere | Circuits | ...    │
├─────────────────────────────────────────┤
│ Circuit Grid (full width, ~200px tall)   │
├───────────────────────────┬─────────────┤
│ Tensor Network Graph (60%)│ Tensor      │
│                           │ Components  │
│                           │ (40%)       │
├───────────────────────────┴─────────────┤
│ Toolbar: [Drag&Drop][Builder][Code]      │
│          [+Qubit][-Qubit][Step▶][Contract All⚡] │
├─────────────────────────────────────────┤
│ Explanation: Beginner | Math | Deeper    │
└─────────────────────────────────────────┘
```

---

## Architecture

### Page routing

`App.tsx` adds `page: 'bloch' | 'circuits'` state (initialized from `localStorage` key `'qv-page'`, falls back to `'bloch'`). NavBar receives `page` + `onNavigate(page)` props. The two pages are fully independent — `CircuitPage` owns its own state via `useReducer`.

### File structure

```
src/
├── App.tsx                          (modify: add page state, conditional render)
├── lib/
│   ├── quantum.ts                   (existing — unchanged)
│   └── tensorNetwork.ts             (new — n-qubit circuit math)
└── components/
    ├── NavBar/NavBar.tsx            (modify: activate Circuits link)
    ├── CircuitPage/
    │   ├── CircuitPage.tsx          (new — top-level page container + reducer + gate palette)
    │   └── CircuitPage.module.css
    ├── CircuitGrid/
    │   ├── CircuitGrid.tsx          (new — SVG circuit diagram)
    │   └── CircuitGrid.module.css
    ├── TensorNetworkGraph/
    │   ├── TensorNetworkGraph.tsx   (new — SVG tensor network)
    │   └── TensorNetworkGraph.module.css
    ├── TensorComponents/
    │   ├── TensorComponents.tsx     (new — heatmap / sparse toggle)
    │   └── TensorComponents.module.css
    └── CircuitExplanation/
        ├── CircuitExplanation.tsx   (new — 3-tab explanation panel)
        ├── CircuitExplanation.module.css
        └── circuitExplanationContent.ts  (new — text per gate type)
```

The **gate palette** (Drag & Drop mode chip row) is rendered inline in `CircuitPage.tsx` — it is not a separate component file.

---

## Data Model (`src/lib/tensorNetwork.ts`)

### Types

```ts
export type QubitId = number  // 0-indexed

export type CircuitGate =
  | { id: string; type: 'single'; gate: GateType; qubit: QubitId; step: number; angle?: number }
  | { id: string; type: 'cnot';   control: QubitId; target: QubitId; step: number }
  | { id: string; type: 'swap';   qubit0: QubitId;  qubit1: QubitId; step: number }

export type TensorNode = {
  id: string
  label: string           // e.g. "H", "CNOT", "|0⟩"
  kind: 'ket' | 'gate' | 'result'
  rank: number            // number of indices (edges)
  shape: number[]         // dimension of each index, e.g. [2,2,2,2] for CNOT
  step?: number           // undefined for 'ket' and 'result' nodes; time step for 'gate' nodes
  qubits: QubitId[]
}

// indexRole: 'in' = this edge feeds into the node's input index for this qubit
//            'out' = this edge carries the node's output index for this qubit
// For a single-qubit gate: one 'in' edge (from prev node) and one 'out' edge (to next node)
// For CNOT: two 'in' edges (control-in, target-in) and two 'out' edges (control-out, target-out)
export type TensorEdge = {
  from: string         // node id
  to: string           // node id
  qubit: QubitId       // which qubit wire this edge belongs to
  indexRole: 'in' | 'out'  // role relative to the 'from' node
}

export type TensorNetwork = {
  nodes: TensorNode[]
  edges: TensorEdge[]
}
```

### Gate ordering invariant

`gates: CircuitGate[]` in `CircuitPageState` is **always maintained in ascending `(step, qubit)` order**. The `ADD_GATE` reducer case inserts the new gate in sorted position (not appended). `CONTRACT_STEP` applies `gates[contractionStep]`, which is always the next gate in time order.

### Functions

```ts
// Initial |0...0⟩ state: array of 2^numQubits Complex values, index 0 = |00...0⟩ has amplitude 1
export function getInitialState(numQubits: number): Complex[]

// Apply one gate to the full n-qubit state vector.
// Algorithm: embed the gate's unitary matrix into the full 2^n × 2^n operator space
// using the standard Kronecker product construction (gate ⊗ I on unaffected qubits),
// then apply as a matrix-vector product. For CNOT and SWAP, use their standard
// 4×4 matrices embedded into the appropriate two-qubit subspace.
export function applyCircuitGate(
  amplitudes: Complex[],
  gate: CircuitGate,
  numQubits: number
): Complex[]

// Amplitude data for visualization
export type AmplitudeEntry = {
  basis: string       // e.g. "|010⟩"
  index: number       // 0..2^n-1
  magnitude: number   // |α|
  phase: number       // arg(α) in [-π, π]
  probSquared: number // |α|²
}
export function getAmplitudeEntries(
  amplitudes: Complex[],
  numQubits: number
): AmplitudeEntry[]

// Derive tensor network graph from circuit.
// Each gate becomes a 'gate' node. Each qubit has one 'ket' node on the left.
// One 'result' node on the right represents the output state.
// Edges connect ket→first-gate→...→last-gate→result along each qubit wire.
// Each edge has indexRole='out' relative to its 'from' node.
export function circuitToTensorNetwork(
  gates: CircuitGate[],
  numQubits: number
): TensorNetwork

// Parse code-mode string to gate list.
// FAIL-FAST: if any token is invalid, returns { gates: [], error: <message> }.
// No partial parse — either the entire string is valid or nothing is applied.
// Syntax: comma-separated tokens, e.g. "H(0), CNOT(0,1), Rz(2, pi/4), SWAP(1,2)"
// Accepts 'pi', 'π', or numeric radians for angles.
export function parseCircuitCode(
  code: string
): { gates: CircuitGate[]; error: string | null }
```

### Validation rules

- CNOT and SWAP: `control !== target` and `qubit0 !== qubit1`. If equal, `ADD_GATE` is a no-op and the UI shows an inline error "Control and target must be different qubits."
- All gate qubit indices must be `< numQubits`. Violated indices are rejected with an error message.

### Constraints

- Max supported qubits: **10** (2¹⁰ = 1024 amplitudes). The UI shows a warning banner when `numQubits > 7`: "Large state space — simulation may be slow."
- Gate types supported: all 9 existing `GateType` values for single-qubit gates + CNOT + SWAP.

---

## Circuit Page State

Managed in `CircuitPage.tsx` via `useReducer`:

```ts
type CircuitPageState = {
  numQubits: number             // 1–10, default 2
  gates: CircuitGate[]          // always sorted by (step, qubit) ascending
  contractionStep: number       // how many gates have been applied (0 = initial |0...0⟩)
  amplitudes: Complex[]         // length 2^numQubits
  inputMode: 'drag' | 'builder' | 'code'
  componentView: 'heatmap' | 'sparse'
  codeText: string              // raw textarea content in code mode, preserved across mode switches
  lastGate: CircuitGate | null  // drives explanation panel
}

type Action =
  | { type: 'ADD_GATE'; gate: CircuitGate }
  | { type: 'REMOVE_GATE'; id: string }
  | { type: 'SET_INPUT_MODE'; mode: CircuitPageState['inputMode'] }
  | { type: 'SET_COMPONENT_VIEW'; view: 'heatmap' | 'sparse' }
  | { type: 'SET_CODE_TEXT'; text: string }  // updates codeText only, does not parse
  | { type: 'APPLY_CODE'; gates: CircuitGate[] }  // replaces gates with parsed result, resets contraction
  | { type: 'ADD_QUBIT' }
  | { type: 'REMOVE_QUBIT' }  // see behavior below
  | { type: 'CONTRACT_STEP' }
  | { type: 'CONTRACT_ALL' }
  | { type: 'RESET' }
```

### REMOVE_QUBIT behavior

`REMOVE_QUBIT` removes the **last qubit** (`numQubits - 1`). If any gate references that qubit index, the action is a **no-op** and the UI shows a tooltip "Remove all gates on this qubit first." No qubit renumbering occurs. The button is visually disabled when any gate references the last qubit.

### CONTRACT_STEP / CONTRACT_ALL

`CONTRACT_STEP` applies `gates[contractionStep]` (guaranteed to be in time order by the sort invariant), increments `contractionStep`, updates `amplitudes` via `applyCircuitGate`, sets `lastGate`. `CONTRACT_ALL` applies all remaining gates sequentially in the same turn (no animation delay in the reducer — the animation is a UI concern in `TensorNetworkGraph`).

---

## Circuit Grid (`CircuitGrid.tsx`)

Rendered as **SVG**. Layout:
- Each qubit row: 40px tall
- Each time step column: 52px wide
- Gate block: 40×32px rounded rect, colored by gate type
- Multi-qubit gates: vertical line between qubit rows + control dot (●) + target circle (⊕ for CNOT, × for SWAP)
- Scrollable horizontally via `overflow-x: auto` on the container

Gate type colors (using existing CSS variables):
| Gate | Color |
|------|-------|
| H | `--accent-blue` |
| X, CNOT target | `--accent-red` |
| Y | `--accent-purple` |
| Z | `--accent-green` |
| S, T | `--text-secondary` |
| Rx, Ry, Rz | `--accent-blue` with angle label |

The gate at index `contractionStep` (next to be contracted) gets a highlight ring in `--accent-blue`. Gates at index `< contractionStep` (already contracted) are rendered at 40% opacity.

**In Drag & Drop mode:** empty cells show a dashed drop zone on hover. `onDragOver` / `onDrop` handlers dispatch `ADD_GATE`.

**In Step Builder mode:** empty cells show a `+` icon on hover; clicking opens an inline gate picker popover.

**In Code mode:** grid is read-only (no drop zones, no `+` icons).

---

## Tensor Network Graph (`TensorNetworkGraph.tsx`)

Rendered as **SVG**, derived automatically from `circuitToTensorNetwork(gates, numQubits)`.

- **Ket nodes** `|0⟩`: small circles on the left edge, one per qubit
- **Gate nodes**: rounded rectangles, column = time step, row = qubit (or midpoint for multi-qubit)
- **Result node**: single circle on the right edge
- **Edges**: straight lines connecting nodes; `indexRole` determines direction (drawn left-to-right)

**Contraction animation:** On `CONTRACT_STEP`, the contracted gate node briefly scales up (CSS transform on SVG `<g>`), then fades; its output edges animate toward the result node. `CONTRACT_ALL` queues these animations with a 300ms delay between each step using `setTimeout`.

**Hover tooltip:** shows tensor shape, e.g. `H: rank-2, shape [2,2]` or `CNOT: rank-4, shape [2,2,2,2]`.

---

## Tensor Components (`TensorComponents.tsx`)

Toggle switch at top: **Heatmap** ↔ **Sparse List**

### Heatmap view
- CSS grid of 2ⁿ cells
- Cell background: magnitude mapped to `hsl(240 - magnitude*200, 80%, 40%)`
- Cell border: phase mapped to hue (`hsl(phase_degrees, 100%, 50%)`, 2px border); `phase_degrees = (phase + π) / (2π) * 360`
- n ≤ 4: cells 40px with basis label; n ≤ 6: cells 24px with label on hover; n > 6: cells 8px, tooltip only
- Below the grid: color legend (magnitude scale bar + phase color wheel)

### Sparse List view
- Filters entries where `probSquared > 0.001`
- Each row: `|basis⟩ · [magnitude bar] · α value · phase`
- Magnitude bar: `--accent-blue` fill, width = `magnitude * 100%`
- Sorted by `probSquared` descending
- Header: `Showing N of 2ⁿ components (threshold: 0.1%)`

---

## Input Modes (within `CircuitPage.tsx`)

### Drag & Drop
- Gate palette rendered as a chip row inside `CircuitPage.tsx`, below the toolbar, visible only when `inputMode === 'drag'`
- Gate chips: `H X Y Z S T Rx Ry Rz CNOT SWAP` — small rounded buttons using HTML5 `draggable` attribute
- `onDragStart` sets `dataTransfer.setData('gateType', gateType)`
- Circuit Grid cells have `onDrop` handler that reads `dataTransfer` and dispatches `ADD_GATE`

### Step Builder
- Form rendered in `CircuitPage.tsx` below the toolbar, visible only when `inputMode === 'builder'`
- Single-qubit: `Gate [select] · Qubit [select] · [Angle input — shown for Rx/Ry/Rz] · [Add]`
- Multi-qubit (CNOT/SWAP): `Gate [select] · Control [select] · Target [select] · [Add]`
- Dispatches `ADD_GATE` on submit; clears form fields after successful add

### Code mode
- `<textarea>` with monospace font, 2 rows, rendered below toolbar, visible only when `inputMode === 'code'`
- `onChange` dispatches `SET_CODE_TEXT` (stores raw text, does not parse)
- Parses via `parseCircuitCode()` on Enter key or 500ms debounce after last keystroke
- On valid parse: dispatches `APPLY_CODE` (replaces gates, resets contraction to 0)
- On error: red border on textarea + inline error message; existing gates are NOT replaced
- `codeText` is preserved in state across mode switches so the user's code is not lost

---

## Explanation Panel (`CircuitExplanation.tsx`)

Same 3-tab pattern as `Explanation.tsx` on the Bloch Sphere page:
- **Beginner** tab: plain-English description of the last applied gate
- **Math** tab: KaTeX-rendered matrix using the existing `katex` dependency
- **Deeper** tab: tensor contraction interpretation

`circuitExplanationContent.ts` exports `getCircuitExplanation(gate: CircuitGate | null)` returning:
```ts
{ title: string; beginner: string; matrix: string; deeper: string }
```
- `matrix` is a **KaTeX LaTeX string** (same format as `Explanation` in the Bloch Sphere page, e.g. `\\begin{pmatrix} 1 & 0 \\\\ 0 & -1 \\end{pmatrix}` for Z gate)
- Covers all 9 single-qubit gates + CNOT + SWAP + a default entry for `null` (no gate selected yet)

---

## NavBar Changes

`NavBar.tsx` receives two new props:
```ts
page: 'bloch' | 'circuits'
onNavigate: (page: 'bloch' | 'circuits') => void
```

Three link styles in `NavBar.module.css`:
- `.linkActive` — current page: `color: var(--text-primary)`, 2px underline in `--accent-blue` (existing)
- `.link` — navigable but not current: `color: var(--text-secondary)`, cursor pointer, no underline; `:hover` adds `color: var(--text-primary)` (new class)
- `.linkDisabled` — not yet available: `color: var(--text-secondary)`, cursor not-allowed (existing, unchanged)

```tsx
// Bloch Sphere link
<span
  className={page === 'bloch' ? styles.linkActive : styles.link}
  onClick={() => onNavigate('bloch')}
>Bloch Sphere</span>

// Circuits link
<span
  className={page === 'circuits' ? styles.linkActive : styles.link}
  onClick={() => onNavigate('circuits')}
>Circuits</span>

// Algorithms — unchanged, still disabled
<span className={styles.linkDisabled}>Algorithms</span>
```

---

## Bloch Sphere Zoom (minor addition, same PR)

Changes to `SphereScene.tsx` and `BlochSphere.tsx`:

**Scroll wheel zoom:** Set `enableZoom={true}` on `<OrbitControls>` in `SphereScene.tsx`.

**Zoom slider:** A vertical `<input type="range">` added in `BlochSphere.tsx`, positioned in the existing `.presets` column alongside the Top/Front/Free buttons.
- Range: `min=0.5 max=3 step=0.1`, default `1` (represents the zoom multiplier)
- Initial camera position is `[1.5, 1.5, 1.5]`, giving a baseline distance of `√(1.5²+1.5²+1.5²) = √6.75 ≈ 2.598`
- Zoom multiplier maps to camera distance: `distance = 2.598 / zoomMultiplier`
- Slider `onChange` → `gsap.to(camera.position, { ... })` to scale the camera position vector by `2.598 / value`
- OrbitControls `onChange` → read `camera.position.length()` → compute `zoomMultiplier = 2.598 / length` → update slider React state
- `cameraRef` is already forwarded via `useFrame` in `SphereScene.tsx`; the slider lives in `BlochSphere.tsx` and needs camera access via a forwarded ref or a callback prop `onCameraChange`

---

## Out of Scope

- Multi-measurement / partial trace
- Saving / loading circuits
- Circuit optimization or transpilation
- Noise models or error simulation
- Phase 3 Algorithms page
- Toffoli or other 3-qubit gates (can be added later)
