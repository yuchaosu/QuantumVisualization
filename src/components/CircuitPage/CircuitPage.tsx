// src/components/CircuitPage/CircuitPage.tsx
import { useReducer, useCallback } from 'react'
import type { CircuitGate, Complex } from '../../lib/tensorNetwork'
import {
  getInitialState, applyCircuitGate, circuitToTensorNetwork, getAmplitudeEntries
} from '../../lib/tensorNetwork'
import styles from './CircuitPage.module.css'

// ─── State & Actions ─────────────────────────────────────────────────────────

export type CircuitPageState = {
  numQubits: number
  gates: CircuitGate[]
  contractionStep: number
  amplitudes: Complex[]
  inputMode: 'drag' | 'builder' | 'code'
  componentView: 'heatmap' | 'sparse'
  codeText: string
  lastGate: CircuitGate | null
}

export type CircuitAction =
  | { type: 'ADD_GATE';          gate: CircuitGate }
  | { type: 'REMOVE_GATE';       id: string }
  | { type: 'SET_INPUT_MODE';    mode: CircuitPageState['inputMode'] }
  | { type: 'SET_COMPONENT_VIEW'; view: 'heatmap' | 'sparse' }
  | { type: 'SET_CODE_TEXT';     text: string }
  | { type: 'APPLY_CODE';        gates: CircuitGate[] }
  | { type: 'ADD_QUBIT' }
  | { type: 'REMOVE_QUBIT' }
  | { type: 'CONTRACT_STEP' }
  | { type: 'CONTRACT_ALL' }
  | { type: 'RESET' }

// ─── Sort helpers ─────────────────────────────────────────────────────────────

function gateMinQubit(g: CircuitGate): number {
  if (g.type === 'single') return g.qubit
  if (g.type === 'cnot')   return Math.min(g.control, g.target)
  return Math.min(g.qubit0, g.qubit1)
}

function insertSorted(gates: CircuitGate[], gate: CircuitGate): CircuitGate[] {
  const key = gate.step * 1000 + gateMinQubit(gate)
  const idx = gates.findIndex(g => g.step * 1000 + gateMinQubit(g) > key)
  if (idx === -1) return [...gates, gate]
  return [...gates.slice(0, idx), gate, ...gates.slice(idx)]
}

function referencesQubit(g: CircuitGate, q: number): boolean {
  if (g.type === 'single') return g.qubit === q
  if (g.type === 'cnot')   return g.control === q || g.target === q
  return g.qubit0 === q || g.qubit1 === q
}

function allInvolvedQubits(g: CircuitGate): number[] {
  if (g.type === 'single') return [g.qubit]
  if (g.type === 'cnot')   return [g.control, g.target]
  return [g.qubit0, g.qubit1]
}

// ─── Reducer ─────────────────────────────────────────────────────────────────

export const initialCircuitState: CircuitPageState = {
  numQubits: 2,
  gates: [],
  contractionStep: 0,
  amplitudes: getInitialState(2),
  inputMode: 'drag',
  componentView: 'heatmap',
  codeText: '',
  lastGate: null,
}

export function circuitReducer(state: CircuitPageState, action: CircuitAction): CircuitPageState {
  switch (action.type) {
    case 'ADD_GATE': {
      // Validate: all qubit indices must be < numQubits
      if (allInvolvedQubits(action.gate).some(q => q >= state.numQubits)) return state
      return { ...state, gates: insertSorted(state.gates, action.gate) }
    }
    case 'REMOVE_GATE':
      return { ...state, gates: state.gates.filter(g => g.id !== action.id) }

    case 'SET_INPUT_MODE':
      return { ...state, inputMode: action.mode }

    case 'SET_COMPONENT_VIEW':
      return { ...state, componentView: action.view }

    case 'SET_CODE_TEXT':
      return { ...state, codeText: action.text }

    case 'APPLY_CODE':
      return {
        ...state,
        gates: action.gates,
        contractionStep: 0,
        amplitudes: getInitialState(state.numQubits),
        lastGate: null,
      }

    case 'ADD_QUBIT': {
      if (state.numQubits >= 10) return state
      const numQubits = state.numQubits + 1
      return { ...state, numQubits, contractionStep: 0, amplitudes: getInitialState(numQubits), lastGate: null }
    }

    case 'REMOVE_QUBIT': {
      if (state.numQubits <= 1) return state
      const lastQ = state.numQubits - 1
      if (state.gates.some(g => referencesQubit(g, lastQ))) return state  // no-op
      const numQubits = state.numQubits - 1
      return {
        ...state, numQubits,
        gates: state.gates,  // gates on remaining qubits are still valid
        contractionStep: 0,
        amplitudes: getInitialState(numQubits),
        lastGate: null,
      }
    }

    case 'CONTRACT_STEP': {
      if (state.contractionStep >= state.gates.length) return state
      const gate = state.gates[state.contractionStep]
      const amplitudes = applyCircuitGate(state.amplitudes, gate, state.numQubits)
      return { ...state, contractionStep: state.contractionStep + 1, amplitudes, lastGate: gate }
    }

    case 'CONTRACT_ALL': {
      let amplitudes = state.amplitudes
      let lastGate = state.lastGate
      for (let i = state.contractionStep; i < state.gates.length; i++) {
        amplitudes = applyCircuitGate(amplitudes, state.gates[i], state.numQubits)
        lastGate = state.gates[i]
      }
      return { ...state, contractionStep: state.gates.length, amplitudes, lastGate }
    }

    case 'RESET':
      return {
        ...initialCircuitState,
        numQubits: state.numQubits,
        amplitudes: getInitialState(state.numQubits),
      }

    default:
      return state
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

type Props = { theme: 'dark' | 'light' }

export default function CircuitPage({ theme: _theme }: Props) {
  const [state, dispatch] = useReducer(circuitReducer, initialCircuitState)

  const tensorNetwork = circuitToTensorNetwork(state.gates, state.numQubits)
  const amplitudeEntries = getAmplitudeEntries(state.amplitudes, state.numQubits)

  const handleAddGate = useCallback((gate: CircuitGate) => {
    dispatch({ type: 'ADD_GATE', gate })
  }, [])

  return (
    <div className={styles.page}>
      <div className={styles.debug} aria-hidden="true">
        {state.numQubits}q · {state.gates.length} gates · step {state.contractionStep}/{state.gates.length}
        · {amplitudeEntries.length} amps · {tensorNetwork.nodes.length} nodes
        {void handleAddGate}
      </div>
    </div>
  )
}
