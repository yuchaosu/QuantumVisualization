# Bloch Sphere Visualizer — Design Spec

**Date:** 2026-04-05
**Phase:** 1 of 3 (Bloch Sphere → Circuit Builder → Algorithm Explorer)
**Status:** Approved

---

## Overview

A React + Vite single-page application for visualizing a single qubit on an interactive Bloch sphere. Targets all audiences — beginners through professionals — with a clean vertical layout and contextual explanations that scale to the user's depth.

This is Phase 1 of a full quantum computation learning platform.

---

## Layout

Five vertical rows, stacked top to bottom:

| Row | Content |
|-----|---------|
| 1 | Navigation bar (site name + links to future phases, disabled in Phase 1) |
| 2 | Interactive Bloch Sphere (largest section) |
| 3 | Gate Controls + operation history |
| 4 | State Readout (state vector, angles, amplitudes, probabilities) |
| 5 | Contextual Explanation (updates per gate, multi-depth tabs) |

**Responsive:** Mobile is out of scope for Phase 1. Minimum supported viewport: 900px wide.

---

## Architecture

**Stack:** React 18, Vite 5, TypeScript, Three.js 0.160.x, React Three Fiber v8 (`@react-three/fiber`), `@react-three/drei` v9, GSAP 3.x (animation), KaTeX 0.16.x (matrix rendering), Vitest 2.x (testing).

No backend. All quantum math runs client-side. No persistence — state resets on refresh.

```
src/
  components/
    BlochSphere/     — R3F canvas, sphere mesh, state vector arrow
    GateControls/    — gate buttons, angle input for Rx/Ry/Rz, history chips
    StateReadout/    — θ, φ, amplitudes, probabilities display
    Explanation/     — contextual text with Beginner / Matrix / Deeper tabs
  lib/
    quantum.ts       — pure qubit state math functions
  App.tsx            — 5-row layout, shared state
```

---

## Components

### NavBar (Row 1)
- Site name "QuantumViz" on the left
- Links: "Bloch Sphere" (active), "Circuits" (disabled, grayed out), "Algorithms" (disabled, grayed out)
- Disabled links are non-clickable with a tooltip: "Coming in Phase 2"

### BlochSphere (Row 2)
- R3F canvas with OrbitControls: drag to rotate, scroll to zoom; default camera at 45° elevation and 45° azimuth
- **Sphere:** semi-transparent (30% opacity) so the state vector arrow is always visible from any angle
- **Axes:** three labeled axis lines through the sphere (+Z/|0⟩ top, −Z/|1⟩ bottom, +X/|+⟩ front, +Y/|i⟩ right side of equator); labels rendered as 2D HTML overlays via `@react-three/drei`'s `<Html>` component
- **Equator ring:** a thin circle in the XY plane
- **State vector:** a thick line from origin to the surface point, with a cone arrowhead; color: bright blue (#58a6ff)
- **Animation:** GSAP tweens `theta` and `phi` over 400ms (ease-in-out) when a gate is applied
- **Camera presets:** three icon buttons overlaid on the canvas (top-right corner): "Top" (looking down Z, shows |0⟩/|1⟩), "Front" (looking along −Y, shows |+⟩/|−⟩), "Free" (resets to default 45°/45°); these are HTML buttons positioned absolutely over the canvas

### GateControls (Row 3)
- Gate buttons in a single horizontal scrollable row: H, X, Y, Z, S, T, Rx(θ), Ry(θ), Rz(θ)
- Rx/Ry/Rz: clicking opens an inline angle input (slider + number field); range `[−2π, 2π]`, step `0.01`, default `Math.PI / 2` (≈ 1.5708); a "Apply" button confirms
- Operation history displayed as a sequence of individual chip elements separated by `→` arrows: a fixed `|0⟩` chip first, then one chip per applied gate. Each chip shows the gate name; Rx/Ry/Rz chips include the angle rounded to 2 decimal places, e.g. `Rx(1.57)`. Example: `|0⟩ → H → X → Rx(1.57)`
- **Undo** button removes the last gate chip and restores the previous state. If a GSAP animation is in progress when Undo is clicked, kill it immediately and snap the arrow to the restored state without animation.
- **Reset** button clears all gate chips and returns to |0⟩

### StateReadout (Row 4)
- 4-column grid:
  1. **State vector:** `|ψ⟩ = α|0⟩ + β|1⟩`
  2. **Angles:** θ (polar, 0 to π) and φ (azimuthal, 0 to 2π) in radians, 2 decimal places
  3. **Amplitudes:** α and β displayed as `a + bi` (2 decimal places each)
  4. **Probabilities:** P(|0⟩) and P(|1⟩) as percentages, each with a thin horizontal bar (green for |0⟩, red for |1⟩)

### Explanation (Row 5)
- Displays context for the last applied gate; defaults to "What is a qubit?" on load
- Three tabs: **Beginner**, **Matrix**, **Deeper**
- Example entry for the H gate:
  - *Beginner:* "The Hadamard gate creates an equal superposition of |0⟩ and |1⟩. Think of it as flipping a perfectly balanced coin — the qubit becomes equally likely to be measured as 0 or 1."
  - *Matrix:* Shows the 2×2 unitary matrix `1/√2 [[1, 1], [1, -1]]` rendered via KaTeX
  - *Deeper:* "H is a rotation of π radians around the (X+Z)/√2 axis on the Bloch sphere. It is its own inverse: H² = I."

---

## Data Flow

### Internal State Representation

The qubit state is stored internally as complex amplitudes `(alpha, beta): [Complex, Complex]` where `Complex = { re: number; im: number }`. This preserves full state information.

`(theta, phi)` are derived from `(alpha, beta)` for display only:
- `theta = 2 * acos(clamp(|alpha|, 0, 1))` — clamped (not periodic; valid range is [0, π])
- `phi`: computed as `arg(beta) - arg(alpha)` where `arg()` returns a value in `(−π, π]`, then modular-normalized to `[0, 2π]` using `((value % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)` — modular normalization (not clamping) because phi is periodic
- Special cases: when `|alpha| = 0` (state is |1⟩), `phi = arg(beta)` then normalize; when `|beta| = 0` (state is |0⟩), `phi = 0`

This ensures gate math is correct (e.g., H applied twice reliably returns to the original state within floating-point tolerance).

### App State Shape

```typescript
type HistoryEntry = {
  gate: GateType;
  angle?: number;       // only for Rx, Ry, Rz
  alpha: Complex;       // state snapshot BEFORE this gate was applied
  beta: Complex;
};

type AppState = {
  alpha: Complex;       // current state
  beta: Complex;
  history: HistoryEntry[];
  lastGate: GateType | null;  // drives Explanation panel; null shows default "What is a qubit?"
};
```

### Update Flow

```
GateControls → dispatches { gate, angle? }
      ↓
quantum.ts: applyGate(alpha, beta, gate, angle?) → [Complex, Complex]
      ↓
App state updated; theta/phi derived for BlochSphere + StateReadout
      ↓
BlochSphere animates arrow, StateReadout updates, Explanation switches content
```

- **Undo:** pop last `HistoryEntry` (call it `popped`). Restore `alpha` and `beta` from `popped.alpha` / `popped.beta` — these are the state values *before* `popped.gate` was applied, i.e., the state after all previous gates. Set `lastGate` to `history[history.length - 1].gate` (the gate of the new last remaining entry), or `null` if history is now empty. This correctly shows the Explanation for the gate that produced the now-current state.
- **Reset:** clear history, set `alpha = {re:1, im:0}`, `beta = {re:0, im:0}` (|0⟩), `lastGate = null`

---

## Quantum Math (`quantum.ts`)

**Convention:** All gates are applied as unitary operators to the state vector `[alpha, beta]` via standard 2×2 matrix multiplication. Rotation direction follows the right-hand rule (physics convention).

```typescript
type Complex = { re: number; im: number };
type GateType = 'H' | 'X' | 'Y' | 'Z' | 'S' | 'T' | 'Rx' | 'Ry' | 'Rz';

function applyGate(
  alpha: Complex,
  beta: Complex,
  gate: GateType,
  angle?: number   // required for Rx, Ry, Rz; ignored otherwise
): [Complex, Complex]

function toBlochAngles(alpha: Complex, beta: Complex): { theta: number; phi: number }
```

Gate matrices (standard definitions):
- **H:** `1/√2 [[1,1],[1,-1]]`
- **X:** `[[0,1],[1,0]]`
- **Y:** `[[0,-i],[i,0]]`
- **Z:** `[[1,0],[0,-1]]`
- **S:** `[[1,0],[0,i]]`
- **T:** `[[1,0],[0,e^{iπ/4}]]`
- **Rx(θ):** `[[cos(θ/2), -i·sin(θ/2)], [-i·sin(θ/2), cos(θ/2)]]`
- **Ry(θ):** `[[cos(θ/2), -sin(θ/2)], [sin(θ/2), cos(θ/2)]]`
- **Rz(θ):** `[[e^{-iθ/2}, 0], [0, e^{iθ/2}]]`

Output angles clamped: θ ∈ [0, π], φ ∈ [0, 2π].

---

## Error Handling

- All inputs are controlled UI — invalid state is impossible by construction
- `toBlochAngles` applies safety net normalization: θ clamped to `[0, π]` (not periodic), φ modular-normalized to `[0, 2π]` (periodic)
- No network calls, no async operations to handle

---

## Testing (Vitest)

Unit tests for `quantum.ts` pure functions:
- `applyGate` H twice returns original state within `1e-10` tolerance
- `applyGate` X on |0⟩ maps to |1⟩ (theta=π)
- `applyGate` Z on |0⟩ leaves state unchanged
- `applyGate` Ry(π) is equivalent to X gate (within `1e-10`)
- `toBlochAngles` returns `{theta:0, phi:0}` for |0⟩ state
- `toBlochAngles` returns `{theta:π, phi:0}` for |1⟩ state

No component tests in Phase 1 — the math is the critical path.

---

## Out of Scope (Phase 1)

- Multi-qubit states
- Quantum circuit builder (Phase 2)
- Algorithm visualizations (Phase 3)
- Backend / persistence
- Export / share state
- Mobile / responsive layout
