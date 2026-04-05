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
