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
| 1 | Navigation bar (site name + links to future phases) |
| 2 | Interactive Bloch Sphere (largest section) |
| 3 | Gate Controls + operation history |
| 4 | State Readout (state vector, angles, amplitudes, probabilities) |
| 5 | Contextual Explanation (updates per gate, multi-depth tabs) |

---

## Architecture

**Stack:** React + Vite, TypeScript, React Three Fiber (`@react-three/fiber`), `@react-three/drei`, GSAP (animation).

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

### BlochSphere
- R3F canvas with OrbitControls (drag to rotate, scroll to zoom)
- Renders: sphere wireframe, north/south pole labels (|0⟩, |1⟩), equator ring, state vector arrow
- Arrow animates smoothly (GSAP or R3F `useSpring`) on each gate application
- Preset camera angles: top (|0⟩), front (|+⟩), free

### GateControls
- Gate buttons: H, X, Y, Z, S, T, Rx(θ), Ry(θ), Rz(θ)
- Rx/Ry/Rz open an angle slider/input before applying
- Operation history displayed as chips: `|0⟩ → H → X → Rx(0.52)`
- Undo (last gate) and Reset (back to |0⟩) buttons

### StateReadout
- 4-column grid:
  1. State vector: `|ψ⟩ = α|0⟩ + β|1⟩`
  2. Angles: θ (polar), φ (azimuthal) in radians
  3. Amplitudes: α and β as complex numbers
  4. Probabilities: P(|0⟩) and P(|1⟩) with bar visualization

### Explanation
- Content switches based on the last applied gate
- Three depth tabs per gate:
  - **Beginner** — plain language intuition
  - **Matrix** — unitary matrix representation
  - **Deeper** — connection to physical rotations, group theory hint

---

## Data Flow

All qubit state lives in `App.tsx` as `{ theta, phi, history }`.

```
App state: { theta, phi, history[] }
      ↓
GateControls → dispatches gate action
      ↓
quantum.ts: applyGate(theta, phi, gate) → [newTheta, newPhi]
      ↓
BlochSphere, StateReadout, Explanation re-render
```

- Undo: pop `history` stack, restore previous `[theta, phi]`
- Reset: clear history, set `theta=0, phi=0` (|0⟩ state)
- State flows **down** as props — no global state library needed

---

## Quantum Math (`quantum.ts`)

Pure functions only. Key operations:

- `applyGate(theta, phi, gate, angle?) → [theta, phi]`
- Single qubit gates implemented as rotations on the Bloch sphere:
  - X → rotate π around X axis
  - Y → rotate π around Y axis
  - Z → rotate π around Z axis
  - H → rotate π around the X+Z diagonal axis
  - S → rotate π/2 around Z axis
  - T → rotate π/4 around Z axis
  - Rx(θ) / Ry(θ) / Rz(θ) → arbitrary rotations

Angles clamped: θ ∈ [0, π], φ ∈ [0, 2π].

---

## Error Handling

- All inputs are controlled UI — invalid state is impossible by construction
- `applyGate` clamps output angles as a safety net
- No network calls, no async operations to handle

---

## Testing

Unit tests for `quantum.ts` pure functions:
- `applyGate(θ, φ, 'H')` applied twice returns original state (H² = I)
- `applyGate(0, 0, 'X')` maps |0⟩ to |1⟩ (θ=π)
- `applyGate(0, 0, 'Z')` leaves |0⟩ unchanged (Z|0⟩ = |0⟩)
- Ry(π) equivalent to X gate (within floating point tolerance)

No component tests in Phase 1 — the math is the critical path.

---

## Out of Scope (Phase 1)

- Multi-qubit states
- Quantum circuit builder
- Algorithm visualizations
- Backend / persistence
- Export / share state

These are addressed in Phase 2 (Circuit Builder) and Phase 3 (Algorithm Explorer).
