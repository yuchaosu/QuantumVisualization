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
