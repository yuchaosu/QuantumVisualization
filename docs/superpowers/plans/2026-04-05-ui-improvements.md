# UI Improvements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the state vector arrow clearly visible, add a warm cream light theme with a toggle button in the nav bar, and make the Bloch sphere fill available vertical space responsively.

**Architecture:** Theme system uses a `data-theme` attribute on `<html>` driven by React state in `App.tsx`, with CSS variables redefined per theme in `index.css`. The vector color is passed as a prop through `BlochSphere` → `SphereScene` so it can vary with the theme. Responsive sizing is a pure CSS fix on two files.

**Tech Stack:** React 18, CSS Modules, CSS custom properties, R3F (Three.js), `localStorage` for persistence.

---

## File Map

| File | What changes |
|------|-------------|
| `src/index.css` | Add `[data-theme="light"]` CSS variables block |
| `src/App.tsx` | Add `theme` state + `THEME_STORAGE_KEY`, `useEffect` to sync to `<html>`, pass `theme`/`onToggleTheme` to NavBar, pass `theme` to BlochSphere |
| `src/components/NavBar/NavBar.tsx` | Accept `theme` + `onToggleTheme` props, render toggle button |
| `src/components/NavBar/NavBar.module.css` | Style the toggle button |
| `src/components/BlochSphere/BlochSphere.tsx` | Accept `theme` prop, derive `vectorColor`, pass to SphereScene |
| `src/components/BlochSphere/SphereScene.tsx` | Accept `vectorColor` prop, apply to shaft + cone; reduce sphere opacity 0.30 → 0.15 |
| `src/App.module.css` | Lower `.sphereRow` min-height 500px → 350px |
| `src/components/BlochSphere/BlochSphere.module.css` | Remove `min-height: 500px` from `.container` |

No new files. No test file changes (these are visual changes; the project has no component test infrastructure).

---

### Task 1: Add light theme CSS variables

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Add the light theme variable block**

Open `src/index.css`. After the closing `}` of `:root { ... }`, append:

```css
[data-theme="light"] {
  --bg-base: #fdf6e3;
  --bg-surface: #f5efe0;
  --bg-elevated: #ede7d4;
  --border: #c8bfa8;
  --text-primary: #2c2416;
  --text-secondary: #6b5d4a;
  --accent-blue: #0066cc;
  --accent-green: #2a7a2a;
  --accent-red: #cc2200;
  --accent-purple: #7030a0;
}
```

The final `src/index.css` should look like:

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

[data-theme="light"] {
  --bg-base: #fdf6e3;
  --bg-surface: #f5efe0;
  --bg-elevated: #ede7d4;
  --border: #c8bfa8;
  --text-primary: #2c2416;
  --text-secondary: #6b5d4a;
  --accent-blue: #0066cc;
  --accent-green: #2a7a2a;
  --accent-red: #cc2200;
  --accent-purple: #7030a0;
}

body {
  background: var(--bg-base);
  color: var(--text-primary);
  font-family: var(--font-sans);
  min-width: 900px;
}
```

- [ ] **Step 2: Verify manually**

Run `npm run dev` and open the app. In DevTools console run:
```js
document.documentElement.setAttribute('data-theme', 'light')
```
The app background should immediately shift to warm cream. Run:
```js
document.documentElement.removeAttribute('data-theme')
```
to revert.

- [ ] **Step 3: Commit**

```bash
git add src/index.css
git commit -m "feat: add light theme CSS variables"
```

---

### Task 2: Theme state in App.tsx

**Files:**
- Modify: `src/App.tsx`

- [ ] **Step 1: Add theme state and localStorage sync**

Replace the imports + App function in `src/App.tsx` with the following. The only additions are: `useState`, `useEffect` imports; `THEME_STORAGE_KEY` constant; `theme` state; two `useEffect` hooks; `onToggleTheme` callback; `theme` prop passed to `NavBar` and `BlochSphere`.

```tsx
// src/App.tsx
import { useReducer, useCallback, useState, useEffect } from 'react'
import type { Complex } from './lib/quantum'
import { applyGate } from './lib/quantum'
import type { GateType } from './lib/quantum'
import { toBlochAngles } from './lib/quantum'
import NavBar from './components/NavBar/NavBar'
import BlochSphere from './components/BlochSphere/BlochSphere'
import GateControls from './components/GateControls/GateControls'
import StateReadout from './components/StateReadout/StateReadout'
import Explanation from './components/Explanation/Explanation'
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

const THEME_STORAGE_KEY = 'qv-theme'

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

  // Initialize theme from localStorage (fall back to 'dark')
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const stored = localStorage.getItem(THEME_STORAGE_KEY)
    return stored === 'light' ? 'light' : 'dark'
  })

  // Apply theme to <html> whenever it changes.
  // Dark mode removes the attribute entirely — dark is the :root default,
  // so no attribute is needed (removing is cleaner than setting to 'dark').
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
    localStorage.setItem(THEME_STORAGE_KEY, theme)
  }, [theme])

  const handleToggleTheme = useCallback(() => {
    setTheme(t => (t === 'dark' ? 'light' : 'dark'))
  }, [])

  const handleApplyGate = useCallback((gate: GateType, angle?: number) => {
    dispatch({ type: 'APPLY_GATE', gate, angle })
  }, [])

  const handleUndo = useCallback(() => dispatch({ type: 'UNDO' }), [])
  const handleReset = useCallback(() => dispatch({ type: 'RESET' }), [])

  const { theta, phi } = toBlochAngles(state.alpha, state.beta)

  return (
    <div className={styles.app}>
      {/* Row 1 */}
      <NavBar theme={theme} onToggleTheme={handleToggleTheme} />

      {/* Row 2: BlochSphere */}
      <div className={styles.sphereRow}>
        <BlochSphere theta={theta} phi={phi} theme={theme} />
      </div>

      {/* Row 3 */}
      <GateControls
        history={state.history}
        onApplyGate={handleApplyGate}
        onUndo={handleUndo}
        onReset={handleReset}
      />

      {/* Row 4 */}
      <StateReadout alpha={state.alpha} beta={state.beta} theta={theta} phi={phi} />

      {/* Row 5 */}
      <Explanation lastGate={state.lastGate} />
    </div>
  )
}
```

- [ ] **Step 2: Verify TypeScript compiles with exactly 2 expected errors**

```bash
npx tsc --noEmit 2>&1 | grep "error TS"
```

Expected: Exactly 2 type errors, both at the `App.tsx` JSX call sites:
1. `Property 'theme' does not exist on type 'IntrinsicAttributes & Props'` on `<NavBar ... theme={theme} />`
2. `Property 'theme' does not exist on type 'IntrinsicAttributes & Props'` on `<BlochSphere ... theme={theme} />`

These are intentional — both components accept the new props in Tasks 3 and 4 respectively. Any other error is unexpected and must be fixed before committing.

- [ ] **Step 3: Commit**

```bash
git add src/App.tsx
git commit -m "feat: add theme state and localStorage persistence to App"
```

---

### Task 3: Theme toggle button in NavBar

> **Note:** The spec's files-changed table lists `src/components/Nav/Nav.tsx` and `Nav.module.css` — those paths are a typo in the spec. The actual files (verified in the codebase) are `src/components/NavBar/NavBar.tsx` and `NavBar.module.css`. Use the paths below.

**Files:**
- Modify: `src/components/NavBar/NavBar.tsx`
- Modify: `src/components/NavBar/NavBar.module.css`

- [ ] **Step 1: Update NavBar.tsx to accept theme props and render the toggle**

Replace the entire contents of `src/components/NavBar/NavBar.tsx`:

```tsx
import styles from './NavBar.module.css'

type Props = {
  theme: 'dark' | 'light'
  onToggleTheme: () => void
}

export default function NavBar({ theme, onToggleTheme }: Props) {
  return (
    <nav className={styles.nav}>
      <span className={styles.logo}>⬛ QuantumViz</span>
      <div className={styles.links}>
        <span className={styles.linkActive}>Bloch Sphere</span>
        <span className={styles.linkDisabled}>Circuits</span>
        <span className={styles.linkDisabled}>Algorithms</span>
      </div>
      <button
        className={styles.themeToggle}
        onClick={onToggleTheme}
        aria-label={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
      >
        {theme === 'dark' ? '🌙' : '☀️'}
      </button>
    </nav>
  )
}
```

- [ ] **Step 2: Add toggle button styles to NavBar.module.css**

Append to `src/components/NavBar/NavBar.module.css`:

```css
.themeToggle {
  background: none;
  border: 1px solid var(--border);
  color: var(--text-secondary);
  width: 32px;
  height: 32px;
  border-radius: 6px;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.themeToggle:hover {
  color: var(--text-primary);
  border-color: var(--accent-blue);
}
```

- [ ] **Step 3: Verify exactly 1 TypeScript error remains**

```bash
npx tsc --noEmit 2>&1 | grep -c "error TS"
```

Expected output: `1` — the single remaining error is the `theme` prop on `<BlochSphere>` in `App.tsx`, which is fixed in Task 4. If the count is not 1, investigate before proceeding.

- [ ] **Step 4: Visual check in the browser**

The nav bar should now show a moon button (🌙) on the right. Clicking it should switch the entire page to warm cream. Clicking again should restore dark. Refreshing the page should preserve the last theme.

- [ ] **Step 5: Commit**

```bash
git add src/components/NavBar/NavBar.tsx src/components/NavBar/NavBar.module.css
git commit -m "feat: add theme toggle button to NavBar"
```

---

### Task 4: Theme-aware vector color + reduced sphere opacity

**Files:**
- Modify: `src/components/BlochSphere/BlochSphere.tsx`
- Modify: `src/components/BlochSphere/SphereScene.tsx`

- [ ] **Step 1: Update BlochSphere.tsx to accept theme and derive vectorColor**

Replace the entire contents of `src/components/BlochSphere/BlochSphere.tsx`:

```tsx
// src/components/BlochSphere/BlochSphere.tsx
import { useState, useCallback } from 'react'
import { Canvas } from '@react-three/fiber'
import SphereScene from './SphereScene'
import styles from './BlochSphere.module.css'

const VECTOR_COLORS = {
  dark: '#00d4ff',
  light: '#005bb5',
} as const

type Preset = 'top' | 'front' | 'free' | null

type Props = {
  theta: number
  phi: number
  theme: 'dark' | 'light'
}

export default function BlochSphere({ theta, phi, theme }: Props) {
  const [preset, setPreset] = useState<Preset>(null)
  const handlePresetApplied = useCallback(() => setPreset(null), [])

  return (
    <div className={styles.container}>
      <Canvas camera={{ position: [1.5, 1.5, 1.5], fov: 50 }}>
        <SphereScene
          theta={theta}
          phi={phi}
          vectorColor={VECTOR_COLORS[theme]}
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

- [ ] **Step 2: Update SphereScene.tsx to accept vectorColor and reduce sphere opacity**

The Props type gains `vectorColor: string`. The shaft mesh and cone mesh change `color="#58a6ff"` to `color={vectorColor}`. The solid sphere opacity changes from `0.30` to `0.15`.

Replace the entire contents of `src/components/BlochSphere/SphereScene.tsx`:

```tsx
// src/components/BlochSphere/SphereScene.tsx
import { useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html, Line, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import gsap from 'gsap'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'

type Props = {
  theta: number
  phi: number
  vectorColor: string
  cameraPreset: 'top' | 'front' | 'free' | null
  onPresetApplied: () => void
}

// Convert Bloch sphere angles to Cartesian point on unit sphere.
// theta=0 → north pole (Y=1), theta=π → south pole (Y=-1).
// phi is the azimuthal angle in the XZ plane.
function blochToCartesian(theta: number, phi: number): [number, number, number] {
  return [
    Math.sin(theta) * Math.cos(phi),
    Math.cos(theta),                  // Y is up in Three.js
    Math.sin(theta) * Math.sin(phi),
  ]
}

export default function SphereScene({ theta, phi, vectorColor, cameraPreset, onPresetApplied }: Props) {
  const arrowGroupRef = useRef<THREE.Group>(null)
  const cameraRef = useRef<THREE.Camera | null>(null)
  const controlsRef = useRef<OrbitControlsImpl | null>(null)

  // Animated display angles (GSAP tweens these)
  const displayRef = useRef({ theta, phi })

  // When theta/phi change, tween to new value
  useEffect(() => {
    gsap.killTweensOf(displayRef.current)
    // Normalize phi delta to [-π, π] so the arrow always takes the short arc
    const deltaPhi = ((phi - displayRef.current.phi + Math.PI) % (2 * Math.PI)) - Math.PI
    const targetPhi = displayRef.current.phi + deltaPhi
    gsap.to(displayRef.current, {
      theta,
      phi: targetPhi,
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
      gsap.to(cam.position, {
        x: 1.5, y: 1.5, z: 1.5,
        duration: 0.6, ease: 'power2.inOut',
        onUpdate: () => controls.update(),
      })
    }
    onPresetApplied()
  }, [cameraPreset, onPresetApplied])

  // Per-frame: update arrow group rotation to point toward the animated Bloch position.
  // Three.js lookAt points the object's local +Z toward the target.
  // The shaft/cone are built along the local +Z axis so this works directly.
  useFrame(({ camera }) => {
    cameraRef.current = camera
    if (!arrowGroupRef.current) return
    const { theta: t, phi: p } = displayRef.current
    const [x, y, z] = blochToCartesian(t, p)
    arrowGroupRef.current.up.set(0, 0, 1)
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

  return (
    <>
      <OrbitControls ref={controlsRef as React.RefObject<OrbitControlsImpl>} enablePan={false} />
      <ambientLight intensity={0.5} />

      {/* Sphere — ghost outline at 15% opacity */}
      <mesh>
        <sphereGeometry args={[1, 32, 32]} />
        <meshStandardMaterial
          color="#58a6ff"
          transparent
          opacity={0.15}
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

      {/* State vector arrow — shaft + cone arrowhead along local +Z axis.
          lookAt() points the group's +Z toward the Bloch surface point.
          CylinderGeometry and ConeGeometry are natively Y-aligned, so we
          rotate each mesh by -π/2 around X to align with +Z.
          Shaft center at z=0.45 (spans 0..0.9), cone center at z=0.975
          (tip reaches z≈1.05 ≈ sphere surface). */}
      <group ref={arrowGroupRef}>
        {/* Shaft */}
        <mesh position={[0, 0, 0.45]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.025, 0.025, 0.9, 8]} />
          <meshStandardMaterial color={vectorColor} />
        </mesh>
        {/* Arrowhead cone — tip points in +Z direction (cone apex is at +Y in local frame,
            which after the -π/2 X rotation maps to +Z) */}
        <mesh position={[0, 0, 0.975]} rotation={[Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.07, 0.15, 8]} />
          <meshStandardMaterial color={vectorColor} />
        </mesh>
      </group>
    </>
  )
}
```

- [ ] **Step 3: Verify TypeScript compiles cleanly**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Visual check**

- In dark mode: arrow should be bright electric cyan (`#00d4ff`), clearly visible against the dark sphere.
- Switch to light mode: arrow should be deep blue (`#005bb5`), clearly visible against cream background.
- The sphere should look noticeably more transparent (ghost-like) compared to before.

- [ ] **Step 5: Run existing tests to confirm no regressions**

```bash
npm test
```

Expected: All 7 tests pass (quantum math tests are unaffected).

- [ ] **Step 6: Commit**

```bash
git add src/components/BlochSphere/BlochSphere.tsx src/components/BlochSphere/SphereScene.tsx
git commit -m "feat: theme-aware vector color and reduced sphere opacity"
```

---

### Task 5: Responsive sphere sizing

**Files:**
- Modify: `src/App.module.css`
- Modify: `src/components/BlochSphere/BlochSphere.module.css`

- [ ] **Step 1: Lower the sphere row floor in App.module.css**

Replace the contents of `src/App.module.css`. The `.app` rule is unchanged — only `.sphereRow` changes (`min-height: 500px` → `350px`):

```css
.app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  min-width: 900px;
}

.sphereRow {
  flex: 1;
  min-height: 350px;
}
```

- [ ] **Step 2: Remove the container floor in BlochSphere.module.css**

Replace the contents of `src/components/BlochSphere/BlochSphere.module.css`:

```css
.container {
  position: relative;
  width: 100%;
  height: 100%;
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

(Changed: removed `min-height: 500px` from `.container`. The row in `App.module.css` now controls the floor.)

- [ ] **Step 3: Visual check**

Resize the browser window vertically. The sphere should grow and shrink with the window. On a tall window it should fill all remaining space between the nav and the gate controls row. On a very short window (< 350px body height) it should stop shrinking at 350px.

- [ ] **Step 4: Run full test suite**

```bash
npm test
```

Expected: All 7 tests pass — final regression check across all five tasks.

- [ ] **Step 5: Commit**

```bash
git add src/App.module.css src/components/BlochSphere/BlochSphere.module.css
git commit -m "feat: responsive sphere sizing — fills available vertical space"
```
