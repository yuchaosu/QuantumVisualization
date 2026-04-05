# Bloch Sphere Visualizer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build an interactive Bloch sphere visualizer SPA where users can apply quantum gates, watch the qubit state animate, and read contextual explanations at three depths.

**Architecture:** React 18 + Vite 5 SPA. All qubit state is stored as complex amplitudes `(alpha, beta)` in `App.tsx` and flows down as props. The Bloch sphere is rendered via React Three Fiber. No backend — pure client-side TypeScript.

**Tech Stack:** React 18, Vite 5, TypeScript, Three.js 0.160.x, `@react-three/fiber` v8, `@react-three/drei@9.105.x`, GSAP 3.12.x, KaTeX 0.16.x, Vitest 2.x

---

## File Map

| File | Responsibility |
|------|----------------|
| `src/lib/quantum.ts` | Pure math: `Complex` type, `GateType`, `applyGate`, `toBlochAngles` |
| `src/App.tsx` | 5-row layout, `AppState`, dispatch logic (apply gate, undo, reset) |
| `src/App.module.css` | Overall page layout (5 rows, min-width 900px) |
| `src/main.tsx` | React entry point |
| `src/components/NavBar/NavBar.tsx` | Site nav — "QuantumViz" + disabled phase links |
| `src/components/NavBar/NavBar.module.css` | NavBar styles |
| `src/components/BlochSphere/BlochSphere.tsx` | R3F Canvas, OrbitControls, camera presets, overlay buttons |
| `src/components/BlochSphere/SphereScene.tsx` | Sphere mesh, axis lines, equator ring, state vector arrow + GSAP animation |
| `src/components/BlochSphere/BlochSphere.module.css` | Canvas container + preset button overlay styles |
| `src/components/GateControls/GateControls.tsx` | Gate buttons, angle input panel, history chips, Undo/Reset |
| `src/components/GateControls/GateControls.module.css` | GateControls styles |
| `src/components/StateReadout/StateReadout.tsx` | 4-column state display (state vector, angles, amplitudes, probabilities) |
| `src/components/StateReadout/StateReadout.module.css` | StateReadout styles |
| `src/components/Explanation/Explanation.tsx` | Tabbed explanation panel (Beginner / Matrix / Deeper) |
| `src/components/Explanation/explanationContent.ts` | Static content for all 9 gates + default "What is a qubit?" |
| `src/components/Explanation/Explanation.module.css` | Explanation styles |
| `src/index.css` | Global reset + CSS variables (colors, dark theme) |
| `tests/lib/quantum.test.ts` | Unit tests for `applyGate` and `toBlochAngles` |

---

## Task 1: Project Scaffold

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `src/main.tsx`, `src/App.tsx`, `index.html`, `src/index.css`

- [ ] **Step 1: Scaffold with Vite**

```bash
cd /Volumes/STORAGE/Yuchao/QuantumVisualization
npm create vite@5 . -- --template react-ts
```

When prompted about non-empty directory, choose to continue (ignore existing files).

- [ ] **Step 2: Install dependencies**

```bash
npm install three@0.160 @react-three/fiber@8 @react-three/drei@9.105 gsap@3.12 katex@0.16
npm install -D vitest@2 @vitest/ui jsdom @testing-library/react @types/three @types/katex
```

- [ ] **Step 3: Configure Vitest in `vite.config.ts`**

Replace the generated `vite.config.ts` with:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
  },
})
```

- [ ] **Step 4: Add test script to `package.json`**

In the `"scripts"` section of `package.json`, add:

```json
"test": "vitest run",
"test:watch": "vitest"
```

- [ ] **Step 5: Replace `src/index.css` with global reset and CSS variables**

```css
*, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

:root {
  --bg-base: #0d1117;
  --bg-surface: #161b22;
  --bg-elevated: #21262d;
  --border: #30363d;
  --text-primary: #e6edf3;
  --text-secondary: #8b949e;
  --accent-blue: #58a6ff;
  --accent-green: #3fb950;
  --accent-red: #f85149;
  --accent-purple: #bc8cff;
  --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
  --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

body {
  background: var(--bg-base);
  color: var(--text-primary);
  font-family: var(--font-sans);
  min-width: 900px;
}
```

- [ ] **Step 6: Replace `src/App.tsx` with a bare placeholder**

```tsx
export default function App() {
  return <div>QuantumViz loading...</div>
}
```

- [ ] **Step 7: Verify dev server starts**

```bash
npm run dev
```

Expected: Vite dev server running at `http://localhost:5173`. Browser shows "QuantumViz loading...".

- [ ] **Step 8: Commit**

```bash
git add -A
git commit -m "chore: scaffold Vite + React + TS project with dependencies"
```

---

## Task 2: Quantum Math Library (TDD)

**Files:**
- Create: `src/lib/quantum.ts`
- Create: `tests/lib/quantum.test.ts`

- [ ] **Step 1: Create the test file with all failing tests**

```typescript
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
```

- [ ] **Step 2: Run tests to verify they all fail**

```bash
npm test
```

Expected: All tests FAIL with "Cannot find module '../../src/lib/quantum'"

- [ ] **Step 3: Create `src/lib/quantum.ts` with full implementation**

```typescript
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
```

- [ ] **Step 4: Run tests to verify they all pass**

```bash
npm test
```

Expected: All 7 tests PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/quantum.ts tests/lib/quantum.test.ts
git commit -m "feat: quantum math library with TDD (applyGate, toBlochAngles)"
```

---

## Task 3: App State + Layout Shell

**Files:**
- Modify: `src/App.tsx`
- Create: `src/App.module.css`

- [ ] **Step 1: Write `src/App.module.css`**

```css
.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-width: 900px;
}

.sphereRow {
  flex: 1;
  min-height: 500px;
}
```

- [ ] **Step 2: Replace `src/App.tsx` with full state + layout shell**

```tsx
// src/App.tsx
import { useReducer, useCallback } from 'react'
import type { Complex } from './lib/quantum'
import { applyGate } from './lib/quantum'
import type { GateType } from './lib/quantum'
import styles from './App.module.css'

export type HistoryEntry = {
  gate: GateType
  angle?: number
  alpha: Complex   // state BEFORE this gate
  beta: Complex
}

export type AppState = {
  alpha: Complex
  beta: Complex
  history: HistoryEntry[]
  lastGate: GateType | null
}

type Action =
  | { type: 'APPLY_GATE'; gate: GateType; angle?: number }
  | { type: 'UNDO' }
  | { type: 'RESET' }

const initialState: AppState = {
  alpha: { re: 1, im: 0 },
  beta:  { re: 0, im: 0 },
  history: [],
  lastGate: null,
}

function reducer(state: AppState, action: Action): AppState {
  switch (action.type) {
    case 'APPLY_GATE': {
      const [newAlpha, newBeta] = applyGate(state.alpha, state.beta, action.gate, action.angle)
      return {
        alpha: newAlpha,
        beta: newBeta,
        history: [
          ...state.history,
          { gate: action.gate, angle: action.angle, alpha: state.alpha, beta: state.beta },
        ],
        lastGate: action.gate,
      }
    }
    case 'UNDO': {
      if (state.history.length === 0) return state
      const next = [...state.history]
      const popped = next.pop()!
      return {
        alpha: popped.alpha,
        beta: popped.beta,
        history: next,
        lastGate: next.length > 0 ? next[next.length - 1].gate : null,
      }
    }
    case 'RESET':
      return initialState
    default:
      return state
  }
}

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState)

  const handleApplyGate = useCallback((gate: GateType, angle?: number) => {
    dispatch({ type: 'APPLY_GATE', gate, angle })
  }, [])

  const handleUndo = useCallback(() => dispatch({ type: 'UNDO' }), [])
  const handleReset = useCallback(() => dispatch({ type: 'RESET' }), [])

  return (
    <div className={styles.app}>
      {/* Row 1: NavBar — placeholder */}
      <div>NAV</div>

      {/* Row 2: BlochSphere — placeholder */}
      <div className={styles.sphereRow}>SPHERE</div>

      {/* Row 3: GateControls — placeholder */}
      <div>GATES</div>

      {/* Row 4: StateReadout — placeholder */}
      <div>STATE</div>

      {/* Row 5: Explanation — placeholder */}
      <div>EXPLANATION</div>
    </div>
  )
}
```

- [ ] **Step 3: Verify dev server still works**

```bash
npm run dev
```

Expected: Page shows NAV / SPHERE / GATES / STATE / EXPLANATION stacked vertically.

- [ ] **Step 4: Commit**

```bash
git add src/App.tsx src/App.module.css
git commit -m "feat: App state shape with useReducer (apply/undo/reset)"
```

---

## Task 4: NavBar Component

**Files:**
- Create: `src/components/NavBar/NavBar.tsx`
- Create: `src/components/NavBar/NavBar.module.css`

- [ ] **Step 1: Create `src/components/NavBar/NavBar.module.css`**

```css
.nav {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  height: 52px;
  background: var(--bg-surface);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.logo {
  font-family: var(--font-mono);
  font-size: 16px;
  font-weight: bold;
  color: var(--accent-blue);
}

.links {
  display: flex;
  gap: 24px;
}

.linkActive {
  color: var(--text-primary);
  font-size: 14px;
  border-bottom: 2px solid var(--accent-blue);
  padding-bottom: 2px;
  cursor: default;
}

.linkDisabled {
  color: var(--text-secondary);
  font-size: 14px;
  cursor: not-allowed;
  position: relative;
}

.linkDisabled:hover::after {
  content: 'Coming in Phase 2';
  position: absolute;
  bottom: -28px;
  left: 50%;
  transform: translateX(-50%);
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  padding: 4px 8px;
  border-radius: 4px;
  font-size: 12px;
  white-space: nowrap;
  z-index: 10;
}
```

- [ ] **Step 2: Create `src/components/NavBar/NavBar.tsx`**

```tsx
import styles from './NavBar.module.css'

export default function NavBar() {
  return (
    <nav className={styles.nav}>
      <span className={styles.logo}>⬛ QuantumViz</span>
      <div className={styles.links}>
        <span className={styles.linkActive}>Bloch Sphere</span>
        <span className={styles.linkDisabled}>Circuits</span>
        <span className={styles.linkDisabled}>Algorithms</span>
      </div>
    </nav>
  )
}
```

- [ ] **Step 3: Wire NavBar into `src/App.tsx`**

Replace `{/* Row 1: NavBar — placeholder */}` and `<div>NAV</div>` with:

```tsx
import NavBar from './components/NavBar/NavBar'
// ...
{/* Row 1 */}
<NavBar />
```

- [ ] **Step 4: Verify in browser**

```bash
npm run dev
```

Expected: Dark nav bar with "⬛ QuantumViz" on left and three links on right. "Circuits" and "Algorithms" appear grayed; hovering shows tooltip.

- [ ] **Step 5: Commit**

```bash
git add src/components/NavBar/ src/App.tsx
git commit -m "feat: NavBar with disabled phase links and tooltip"
```

---

## Task 5: Bloch Sphere Component

**Files:**
- Create: `src/components/BlochSphere/SphereScene.tsx`
- Create: `src/components/BlochSphere/BlochSphere.tsx`
- Create: `src/components/BlochSphere/BlochSphere.module.css`

This is the most complex component. It consists of two parts:
- `SphereScene` — the Three.js scene objects (runs inside the R3F Canvas)
- `BlochSphere` — the Canvas wrapper + camera preset overlay buttons

- [ ] **Step 1: Create `src/components/BlochSphere/BlochSphere.module.css`**

```css
.container {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: 500px;
  background: var(--bg-base);
}

.presets {
  position: absolute;
  top: 12px;
  right: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
  z-index: 10;
}

.presetBtn {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  padding: 4px 10px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
  font-family: var(--font-sans);
}

.presetBtn:hover {
  color: var(--text-primary);
  border-color: var(--accent-blue);
}
```

- [ ] **Step 2: Create `src/components/BlochSphere/SphereScene.tsx`**

```tsx
// src/components/BlochSphere/SphereScene.tsx
import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, Line, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import gsap from 'gsap'

type Props = {
  theta: number
  phi: number
  cameraPreset: 'top' | 'front' | 'free' | null
  onPresetApplied: () => void
}

// Convert Bloch sphere angles to Cartesian point on unit sphere
function blochToCartesian(theta: number, phi: number): [number, number, number] {
  return [
    Math.sin(theta) * Math.cos(phi),
    Math.cos(theta),                  // Y is up in Three.js
    Math.sin(theta) * Math.sin(phi),
  ]
}

export default function SphereScene({ theta, phi, cameraPreset, onPresetApplied }: Props) {
  const arrowGroupRef = useRef<THREE.Group>(null)
  const cameraRef = useRef<THREE.Camera | null>(null)
  const controlsRef = useRef<any>(null)

  // Animated display angles (GSAP tweens these)
  const displayRef = useRef({ theta, phi })

  // When theta/phi change, tween to new value
  useEffect(() => {
    gsap.killTweensOf(displayRef.current)
    gsap.to(displayRef.current, {
      theta,
      phi,
      duration: 0.4,
      ease: 'power2.inOut',
    })
  }, [theta, phi])

  // Camera preset handler
  useEffect(() => {
    if (!cameraPreset || !cameraRef.current || !controlsRef.current) return
    const cam = cameraRef.current
    const controls = controlsRef.current

    if (cameraPreset === 'top') {
      gsap.to(cam.position, { x: 0, y: 3, z: 0.001, duration: 0.6, ease: 'power2.inOut',
        onUpdate: () => controls.update() })
    } else if (cameraPreset === 'front') {
      gsap.to(cam.position, { x: 0, y: 0, z: 3, duration: 0.6, ease: 'power2.inOut',
        onUpdate: () => controls.update() })
    } else if (cameraPreset === 'free') {
      const r = 3
      gsap.to(cam.position, {
        x: r * Math.sin(Math.PI / 4) * Math.cos(Math.PI / 4),
        y: r * Math.cos(Math.PI / 4),
        z: r * Math.sin(Math.PI / 4) * Math.sin(Math.PI / 4),
        duration: 0.6, ease: 'power2.inOut',
        onUpdate: () => controls.update(),
      })
    }
    onPresetApplied()
  }, [cameraPreset, onPresetApplied])

  // Per-frame: update arrow mesh to match animated display angles
  useFrame(({ camera }) => {
    cameraRef.current = camera
    if (!arrowGroupRef.current) return
    const { theta: t, phi: p } = displayRef.current
    const [x, y, z] = blochToCartesian(t, p)
    arrowGroupRef.current.position.set(0, 0, 0)
    arrowGroupRef.current.lookAt(x, y, z)
  })

  // One Line per axis; Z axis gets two labels (one at each pole)
  const axes: Array<{
    points: [[number,number,number],[number,number,number]]
    labels: Array<{ text: string; pos: [number,number,number] }>
  }> = [
    {
      points: [[0, -1.3, 0], [0, 1.3, 0]],
      labels: [
        { text: '+Z / |0⟩', pos: [0,  1.55, 0] },
        { text: '−Z / |1⟩', pos: [0, -1.65, 0] },
      ],
    },
    {
      points: [[-1.3, 0, 0], [1.3, 0, 0]],
      labels: [{ text: '+X / |+⟩', pos: [1.65, 0, 0] }],
    },
    {
      points: [[0, 0, -1.3], [0, 0, 1.3]],
      labels: [{ text: '+Y / |i⟩', pos: [0, 0, 1.65] }],
    },
  ]

  // Equator ring geometry
  const equatorPoints = Array.from({ length: 65 }, (_, i) => {
    const a = (i / 64) * Math.PI * 2
    return new THREE.Vector3(Math.cos(a), 0, Math.sin(a))
  })

  // State vector endpoint (animated via useFrame updating the group)
  const [ax, ay, az] = blochToCartesian(theta, phi)

  return (
    <>
      <OrbitControls ref={controlsRef} enablePan={false} />
      <ambientLight intensity={0.5} />

      {/* Sphere */}
      <mesh>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          color="#58a6ff"
          transparent
          opacity={0.30}
          wireframe={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh>
        <sphereGeometry args={[1, 16, 16]} />
        <meshStandardMaterial color="#30363d" wireframe transparent opacity={0.3} />
      </mesh>

      {/* Axes — one Line per axis, labels at each end */}
      {axes.map((axis, i) => (
        <group key={i}>
          <Line points={axis.points} color="#444c56" lineWidth={1} />
          {axis.labels.map(lbl => (
            <Html key={lbl.text} position={lbl.pos} center>
              <span style={{ color: '#8b949e', fontSize: 12, fontFamily: 'monospace', whiteSpace: 'nowrap' }}>
                {lbl.text}
              </span>
            </Html>
          ))}
        </group>
      ))}

      {/* Equator ring */}
      <Line points={equatorPoints} color="#444c56" lineWidth={1} />

      {/* State vector arrow */}
      <group ref={arrowGroupRef}>
        {/* Shaft */}
        <mesh position={[0, 0.45, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.9, 8]} />
          <meshStandardMaterial color="#58a6ff" />
        </mesh>
        {/* Arrowhead cone */}
        <mesh position={[0, 0.95, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.07, 0.15, 8]} />
          <meshStandardMaterial color="#58a6ff" />
        </mesh>
      </group>
    </>
  )
}
```

> **Note:** The arrow group uses `lookAt` in `useFrame` to point toward the current animated Bloch sphere point. The group is rotated so its local +Y axis points toward the target. The shaft + cone are built along the local Y axis with combined length of ~1.1 units.

- [ ] **Step 3: Create `src/components/BlochSphere/BlochSphere.tsx`**

```tsx
// src/components/BlochSphere/BlochSphere.tsx
import { useState, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import SphereScene from './SphereScene'
import styles from './BlochSphere.module.css'

type Preset = 'top' | 'front' | 'free' | null

type Props = {
  theta: number
  phi: number
}

export default function BlochSphere({ theta, phi }: Props) {
  const [preset, setPreset] = useState<Preset>(null)
  const handlePresetApplied = useCallback(() => setPreset(null), [])

  return (
    <div className={styles.container}>
      <Canvas camera={{ position: [1.5, 1.5, 1.5], fov: 50 }}>
        <SphereScene
          theta={theta}
          phi={phi}
          cameraPreset={preset}
          onPresetApplied={handlePresetApplied}
        />
      </Canvas>
      <div className={styles.presets}>
        <button className={styles.presetBtn} onClick={() => setPreset('top')}>Top</button>
        <button className={styles.presetBtn} onClick={() => setPreset('front')}>Front</button>
        <button className={styles.presetBtn} onClick={() => setPreset('free')}>Free</button>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Wire BlochSphere into `src/App.tsx`**

Import `toBlochAngles` and `BlochSphere`, replace the SPHERE placeholder:

```tsx
import { toBlochAngles } from './lib/quantum'
import BlochSphere from './components/BlochSphere/BlochSphere'

// Inside App(), before return:
const { theta, phi } = toBlochAngles(state.alpha, state.beta)

// In JSX, replace <div className={styles.sphereRow}>SPHERE</div> with:
<div className={styles.sphereRow}>
  <BlochSphere theta={theta} phi={phi} />
</div>
```

- [ ] **Step 5: Verify in browser**

```bash
npm run dev
```

Expected: Interactive 3D Bloch sphere with axis labels, semi-transparent sphere, blue state vector arrow pointing to north pole (|0⟩). Drag to rotate, scroll to zoom. Top/Front/Free preset buttons animate the camera.

- [ ] **Step 6: Commit**

```bash
git add src/components/BlochSphere/ src/App.tsx
git commit -m "feat: interactive Bloch sphere with R3F, GSAP animation, camera presets"
```

---

## Task 6: GateControls Component

**Files:**
- Create: `src/components/GateControls/GateControls.tsx`
- Create: `src/components/GateControls/GateControls.module.css`

- [ ] **Step 1: Create `src/components/GateControls/GateControls.module.css`**

```css
.container {
  background: var(--bg-surface);
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  padding: 12px 24px;
  flex-shrink: 0;
}

.gateRow {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: nowrap;
  overflow-x: auto;
  padding-bottom: 4px;
}

.gateBtn {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  color: var(--text-primary);
  padding: 6px 14px;
  border-radius: 5px;
  font-size: 13px;
  font-family: var(--font-mono);
  cursor: pointer;
  white-space: nowrap;
  flex-shrink: 0;
}

.gateBtn:hover {
  border-color: var(--accent-blue);
  color: var(--accent-blue);
}

.anglePanel {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  padding: 8px 12px;
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  border-radius: 6px;
}

.angleLabel {
  color: var(--text-secondary);
  font-size: 13px;
}

.angleSlider {
  flex: 1;
  accent-color: var(--accent-blue);
}

.angleNumber {
  width: 70px;
  background: var(--bg-surface);
  border: 1px solid var(--border);
  color: var(--text-primary);
  padding: 3px 6px;
  border-radius: 4px;
  font-size: 13px;
  font-family: var(--font-mono);
}

.applyBtn {
  background: var(--accent-blue);
  color: #0d1117;
  border: none;
  padding: 5px 14px;
  border-radius: 4px;
  font-size: 13px;
  cursor: pointer;
  font-weight: 600;
}

.historyRow {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-top: 10px;
  overflow-x: auto;
  padding-bottom: 2px;
}

.chip {
  background: var(--bg-elevated);
  border: 1px solid var(--border);
  color: var(--text-secondary);
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-family: var(--font-mono);
  flex-shrink: 0;
}

.chipStart {
  color: var(--accent-blue);
  border-color: var(--accent-blue);
}

.arrow {
  color: var(--text-secondary);
  font-size: 12px;
  flex-shrink: 0;
}

.controls {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

.undoBtn, .resetBtn {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-secondary);
  padding: 4px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

.undoBtn:hover, .resetBtn:hover {
  color: var(--text-primary);
  border-color: var(--text-primary);
}
```

- [ ] **Step 2: Create `src/components/GateControls/GateControls.tsx`**

```tsx
// src/components/GateControls/GateControls.tsx
import React, { useState, useCallback } from 'react'
import type { GateType } from '../../lib/quantum'
import type { HistoryEntry } from '../../App'
import styles from './GateControls.module.css'

type RotationGate = 'Rx' | 'Ry' | 'Rz'
const ROTATION_GATES: RotationGate[] = ['Rx', 'Ry', 'Rz']
const isRotation = (g: GateType): g is RotationGate => ROTATION_GATES.includes(g as RotationGate)

type Props = {
  history: HistoryEntry[]
  onApplyGate: (gate: GateType, angle?: number) => void
  onUndo: () => void
  onReset: () => void
}

const ALL_GATES: GateType[] = ['H', 'X', 'Y', 'Z', 'S', 'T', 'Rx', 'Ry', 'Rz']

export default function GateControls({ history, onApplyGate, onUndo, onReset }: Props) {
  const [openGate, setOpenGate] = useState<RotationGate | null>(null)
  const [angle, setAngle] = useState(Math.PI / 2)

  const handleGateClick = useCallback((gate: GateType) => {
    if (isRotation(gate)) {
      setOpenGate(prev => (prev === gate ? null : gate))
      setAngle(Math.PI / 2)
    } else {
      setOpenGate(null)
      onApplyGate(gate)
    }
  }, [onApplyGate])

  const handleApply = useCallback(() => {
    if (!openGate) return
    onApplyGate(openGate, angle)
    setOpenGate(null)
  }, [openGate, angle, onApplyGate])

  const chipLabel = (entry: HistoryEntry) =>
    isRotation(entry.gate) ? `${entry.gate}(${entry.angle!.toFixed(2)})` : entry.gate

  return (
    <div className={styles.container}>
      {/* Gate buttons + Undo/Reset */}
      <div className={styles.gateRow}>
        {ALL_GATES.map(gate => (
          <button
            key={gate}
            className={styles.gateBtn}
            onClick={() => handleGateClick(gate)}
          >
            {gate}
          </button>
        ))}
        <div className={styles.controls}>
          <button className={styles.undoBtn} onClick={onUndo} disabled={history.length === 0}>
            ↩ Undo
          </button>
          <button className={styles.resetBtn} onClick={onReset}>
            Reset
          </button>
        </div>
      </div>

      {/* Angle input panel (Rx/Ry/Rz) */}
      {openGate && (
        <div className={styles.anglePanel}>
          <span className={styles.angleLabel}>{openGate}(θ):</span>
          <input
            className={styles.angleSlider}
            type="range"
            min={-2 * Math.PI}
            max={2 * Math.PI}
            step={0.01}
            value={angle}
            onChange={e => setAngle(Number(e.target.value))}
          />
          <input
            className={styles.angleNumber}
            type="number"
            min={-2 * Math.PI}
            max={2 * Math.PI}
            step={0.01}
            value={angle.toFixed(4)}
            onChange={e => setAngle(Number(e.target.value))}
          />
          <button className={styles.applyBtn} onClick={handleApply}>Apply</button>
          <button
            className={styles.undoBtn}
            onClick={() => setOpenGate(null)}
            title="Cancel (Esc)"
          >✕</button>
        </div>
      )}

      {/* History chips */}
      <div className={styles.historyRow}>
        <span className={`${styles.chip} ${styles.chipStart}`}>|0⟩</span>
        {history.map((entry, i) => (
          <React.Fragment key={i}>
            <span className={styles.arrow}>→</span>
            <span className={styles.chip}>{chipLabel(entry)}</span>
          </React.Fragment>
        ))}
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Add Escape key handler to close angle panel**

Add a `useEffect` inside `GateControls` (after the `useState` declarations):

```tsx
import { useState, useCallback, useEffect } from 'react'

// Inside GateControls component:
useEffect(() => {
  const handleKeyDown = (e: KeyboardEvent) => {
    if (e.key === 'Escape') setOpenGate(null)
  }
  window.addEventListener('keydown', handleKeyDown)
  return () => window.removeEventListener('keydown', handleKeyDown)
}, [])
```

- [ ] **Step 4: Wire GateControls into `src/App.tsx`**

```tsx
import GateControls from './components/GateControls/GateControls'

// Replace <div>GATES</div> with:
<GateControls
  history={state.history}
  onApplyGate={handleApplyGate}
  onUndo={handleUndo}
  onReset={handleReset}
/>
```

- [ ] **Step 5: Verify in browser — apply gates, watch arrow move**

```bash
npm run dev
```

Expected: Gate buttons present. Clicking H/X/Y/Z/S/T applies the gate and arrow animates. Clicking Rx/Ry/Rz opens the angle panel. History chips appear after each gate. Undo removes the last chip and restores previous state. Reset clears all.

- [ ] **Step 6: Commit**

```bash
git add src/components/GateControls/ src/App.tsx
git commit -m "feat: GateControls with gate buttons, angle input, history chips, undo/reset"
```

---

## Task 7: StateReadout Component

**Files:**
- Create: `src/components/StateReadout/StateReadout.tsx`
- Create: `src/components/StateReadout/StateReadout.module.css`

- [ ] **Step 1: Create `src/components/StateReadout/StateReadout.module.css`**

```css
.container {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 1px;
  background: var(--border);
  border-top: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  flex-shrink: 0;
}

.cell {
  background: var(--bg-surface);
  padding: 12px 16px;
}

.cellLabel {
  color: var(--text-secondary);
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin-bottom: 6px;
}

.cellValue {
  color: var(--text-primary);
  font-family: var(--font-mono);
  font-size: 13px;
  line-height: 1.6;
}

.angleValue {
  color: var(--accent-purple);
}

.probBar {
  height: 4px;
  border-radius: 2px;
  margin-top: 4px;
  transition: width 0.3s ease;
}

.probBarZero {
  background: var(--accent-green);
}

.probBarOne {
  background: var(--accent-red);
}

.probRow {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.probEntry {
  display: flex;
  flex-direction: column;
}

.probLabel {
  color: var(--text-secondary);
  font-family: var(--font-mono);
  font-size: 12px;
  margin-bottom: 2px;
}
```

- [ ] **Step 2: Create `src/components/StateReadout/StateReadout.tsx`**

```tsx
// src/components/StateReadout/StateReadout.tsx
import type { Complex } from '../../lib/quantum'
import styles from './StateReadout.module.css'

type Props = {
  alpha: Complex
  beta: Complex
  theta: number
  phi: number
}

function fmt(n: number): string {
  return n.toFixed(2)
}

function fmtComplex(c: Complex): string {
  const sign = c.im >= 0 ? '+' : '−'
  return `${fmt(c.re)} ${sign} ${fmt(Math.abs(c.im))}i`
}

export default function StateReadout({ alpha, beta, theta, phi }: Props) {
  const magAlpha = Math.sqrt(alpha.re ** 2 + alpha.im ** 2)
  const magBeta  = Math.sqrt(beta.re ** 2 + beta.im ** 2)
  const probZero = magAlpha * magAlpha
  const probOne  = magBeta  * magBeta

  return (
    <div className={styles.container}>
      {/* Column 1: State Vector */}
      <div className={styles.cell}>
        <div className={styles.cellLabel}>State Vector</div>
        <div className={styles.cellValue}>|ψ⟩ = α|0⟩ + β|1⟩</div>
      </div>

      {/* Column 2: Angles */}
      <div className={styles.cell}>
        <div className={styles.cellLabel}>Angles</div>
        <div className={`${styles.cellValue} ${styles.angleValue}`}>
          θ = {fmt(theta)} rad<br />
          φ = {fmt(phi)} rad
        </div>
      </div>

      {/* Column 3: Amplitudes */}
      <div className={styles.cell}>
        <div className={styles.cellLabel}>Amplitudes</div>
        <div className={styles.cellValue}>
          α = {fmtComplex(alpha)}<br />
          β = {fmtComplex(beta)}
        </div>
      </div>

      {/* Column 4: Probabilities */}
      <div className={styles.cell}>
        <div className={styles.cellLabel}>Probabilities</div>
        <div className={styles.probRow}>
          <div className={styles.probEntry}>
            <span className={styles.probLabel}>P(|0⟩) = {(probZero * 100).toFixed(0)}%</span>
            <div className={`${styles.probBar} ${styles.probBarZero}`}
              style={{ width: `${probZero * 100}%` }} />
          </div>
          <div className={styles.probEntry}>
            <span className={styles.probLabel}>P(|1⟩) = {(probOne * 100).toFixed(0)}%</span>
            <div className={`${styles.probBar} ${styles.probBarOne}`}
              style={{ width: `${probOne * 100}%` }} />
          </div>
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Wire StateReadout into `src/App.tsx`**

```tsx
import StateReadout from './components/StateReadout/StateReadout'

// Replace <div>STATE</div> with:
<StateReadout alpha={state.alpha} beta={state.beta} theta={theta} phi={phi} />
```

- [ ] **Step 4: Verify in browser**

Expected: 4-column row below gate controls showing state vector label, angles in purple, complex amplitudes, and probability bars (green/red) that update as you apply gates.

- [ ] **Step 5: Commit**

```bash
git add src/components/StateReadout/ src/App.tsx
git commit -m "feat: StateReadout component with 4-column state display"
```

---

## Task 8: Explanation Component

**Files:**
- Create: `src/components/Explanation/explanationContent.ts`
- Create: `src/components/Explanation/Explanation.tsx`
- Create: `src/components/Explanation/Explanation.module.css`

- [ ] **Step 1: Create `src/components/Explanation/explanationContent.ts`**

```typescript
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
```

- [ ] **Step 2: Create `src/components/Explanation/Explanation.module.css`**

```css
.container {
  background: var(--bg-surface);
  border-top: 1px solid var(--border);
  padding: 16px 24px;
  flex-shrink: 0;
}

.header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}

.title {
  font-size: 15px;
  font-weight: 600;
  color: var(--text-primary);
}

.tabs {
  display: flex;
  gap: 4px;
  margin-left: auto;
}

.tab {
  background: transparent;
  border: 1px solid var(--border);
  color: var(--text-secondary);
  padding: 3px 12px;
  border-radius: 4px;
  font-size: 12px;
  cursor: pointer;
}

.tabActive {
  background: var(--accent-blue);
  border-color: var(--accent-blue);
  color: #0d1117;
  font-weight: 600;
}

.content {
  color: var(--text-secondary);
  font-size: 14px;
  line-height: 1.7;
}

.matrixContent {
  font-family: var(--font-mono);
  overflow-x: auto;
}

/* KaTeX overrides for dark theme */
.matrixContent .katex {
  color: var(--text-primary);
  font-size: 15px;
}
```

- [ ] **Step 3: Create `src/components/Explanation/Explanation.tsx`**

```tsx
// src/components/Explanation/Explanation.tsx
import { useState } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import type { GateType } from '../../lib/quantum'
import { getExplanation } from './explanationContent'
import styles from './Explanation.module.css'

type Tab = 'beginner' | 'matrix' | 'deeper'

type Props = {
  lastGate: GateType | null
}

export default function Explanation({ lastGate }: Props) {
  const [tab, setTab] = useState<Tab>('beginner')
  const entry = getExplanation(lastGate)

  const matrixHtml = katex.renderToString(entry.matrix, {
    throwOnError: false,
    displayMode: true,
  })

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.title}>{entry.title}</span>
        <div className={styles.tabs}>
          {(['beginner', 'matrix', 'deeper'] as Tab[]).map(t => (
            <button
              key={t}
              className={`${styles.tab} ${tab === t ? styles.tabActive : ''}`}
              onClick={() => setTab(t)}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.content}>
        {tab === 'beginner' && <p>{entry.beginner}</p>}
        {tab === 'matrix' && (
          <div
            className={styles.matrixContent}
            dangerouslySetInnerHTML={{ __html: matrixHtml }}
          />
        )}
        {tab === 'deeper' && <p>{entry.deeper}</p>}
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Wire Explanation into `src/App.tsx`**

```tsx
import Explanation from './components/Explanation/Explanation'

// Replace <div>EXPLANATION</div> with:
<Explanation lastGate={state.lastGate} />
```

- [ ] **Step 5: Verify in browser**

Expected: Explanation row at bottom. Default shows "What is a qubit?". Applying H switches to "Hadamard Gate (H)" with 3 tabs. Matrix tab shows KaTeX-rendered equation. Deeper tab shows technical explanation.

- [ ] **Step 6: Commit**

```bash
git add src/components/Explanation/ src/App.tsx
git commit -m "feat: Explanation component with Beginner/Matrix/Deeper tabs and KaTeX"
```

---

## Task 9: Final Polish + Verification

**Files:**
- Modify: `src/App.module.css` (section dividers, spacing)

- [ ] **Step 1: Update `src/App.module.css` for full layout**

```css
.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-width: 900px;
}

.sphereRow {
  flex: 1;
  min-height: 500px;
}
```

(No changes needed if it already matches — verify the sphere row fills remaining space.)

- [ ] **Step 2: Run all tests**

```bash
npm test
```

Expected: All 7 unit tests PASS. Zero failures.

- [ ] **Step 3: Manual smoke test — apply a full circuit**

In the browser (`npm run dev`):
1. Click H → arrow moves to equator (+X direction)
2. Click X → arrow moves to south pole (|1⟩)
3. Click H → arrow moves to equator (−X direction, the |−⟩ state)
4. Click Undo three times → arrow returns to north pole (|0⟩), history chips clear
5. Click Reset → same result as above
6. Click Rx → angle panel appears. Set θ = 1.57, click Apply → arrow rotates
7. Press Escape → angle panel closes
8. Click Top preset → camera snaps to top-down view
9. Verify StateReadout updates on each gate
10. Verify Explanation switches content on each gate

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "feat: Phase 1 complete — Bloch sphere visualizer with full 5-row layout"
```
