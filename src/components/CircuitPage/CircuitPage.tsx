// src/components/CircuitPage/CircuitPage.tsx
import { useReducer, useCallback, useState, useRef, useEffect } from 'react'
import type { CircuitGate } from '../../lib/tensorNetwork'
import type { GateType } from '../../lib/quantum'
import {
  getInitialState, applyCircuitGate, circuitToTensorNetwork, getAmplitudeEntries,
  parseCircuitCode
} from '../../lib/tensorNetwork'
import CircuitGrid from '../CircuitGrid/CircuitGrid'
import TensorNetworkGraph from '../TensorNetworkGraph/TensorNetworkGraph'
import TensorComponents from '../TensorComponents/TensorComponents'
import CircuitExplanation from '../CircuitExplanation/CircuitExplanation'
import styles from './CircuitPage.module.css'

// ─── State & Actions ─────────────────────────────────────────────────────────

export type CircuitPageState = {
  numQubits: number
  gates: CircuitGate[]
  contractionStep: number
  amplitudes: import('../../lib/tensorNetwork').Complex[]
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

// ─── BuilderForm ─────────────────────────────────────────────────────────────

function BuilderForm({
  numQubits, currentGates, onAdd
}: {
  numQubits: number
  currentGates: CircuitGate[]
  onAdd: (gate: CircuitGate) => void
}) {
  const [gateType, setGateType] = useState('H')
  const [qubit, setQubit] = useState(0)
  const [ctrl, setCtrl] = useState(0)
  const [tgt, setTgt] = useState(1)
  const [angle, setAngle] = useState(Math.PI / 2)
  const [error, setError] = useState<string | null>(null)

  const isMulti    = gateType === 'CNOT' || gateType === 'SWAP'
  const isRotation = gateType === 'Rx' || gateType === 'Ry' || gateType === 'Rz'

  const nextStep = currentGates.length === 0 ? 0
    : Math.max(...currentGates.map(g => g.step)) + 1

  function handleAdd() {
    const id = `b-${Date.now()}`
    if (isMulti) {
      if (ctrl === tgt) { setError('Control and target must be different'); return }
      onAdd(gateType === 'CNOT'
        ? { id, type:'cnot', control:ctrl, target:tgt, step:nextStep }
        : { id, type:'swap', qubit0:ctrl, qubit1:tgt, step:nextStep })
    } else {
      onAdd({
        id, type:'single',
        gate: gateType as GateType,
        qubit, step: nextStep,
        ...(isRotation ? { angle } : {}),
      })
    }
    setError(null)
  }

  return (
    <div className={styles.builderForm}>
      <select value={gateType} onChange={e => setGateType(e.target.value)} className={styles.select}>
        {['H','X','Y','Z','S','T','Rx','Ry','Rz','CNOT','SWAP'].map(g => (
          <option key={g} value={g}>{g}</option>
        ))}
      </select>
      {!isMulti ? (
        <select value={qubit} onChange={e => setQubit(+e.target.value)} className={styles.select}>
          {Array.from({length:numQubits},(_,i)=><option key={i} value={i}>q{i}</option>)}
        </select>
      ) : (
        <>
          <select value={ctrl} onChange={e => setCtrl(+e.target.value)} className={styles.select}>
            {Array.from({length:numQubits},(_,i)=><option key={i} value={i}>q{i}</option>)}
          </select>
          <span className={styles.arrow}>→</span>
          <select value={tgt} onChange={e => setTgt(+e.target.value)} className={styles.select}>
            {Array.from({length:numQubits},(_,i)=><option key={i} value={i}>q{i}</option>)}
          </select>
        </>
      )}
      {isRotation && (
        <input type="number" value={angle} step={0.1}
          onChange={e => setAngle(parseFloat(e.target.value))}
          className={styles.select} style={{width:72}} />
      )}
      <button className={styles.addBtn} onClick={handleAdd}>Add</button>
      {error && <span className={styles.errorText}>{error}</span>}
    </div>
  )
}

// ─── CodeInput ────────────────────────────────────────────────────────────────

function CodeInput({
  codeText, numQubits, dispatch
}: {
  codeText: string
  numQubits: number
  dispatch: React.Dispatch<CircuitAction>
}) {
  const [error, setError] = useState<string | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  function tryApply(text: string) {
    if (!text.trim()) return
    const { gates, error: parseErr } = parseCircuitCode(text)
    if (parseErr) { setError(parseErr); return }
    const outOfRange = gates.some(g => {
      const qs = g.type === 'single' ? [g.qubit]
        : g.type === 'cnot' ? [g.control, g.target]
        : [g.qubit0, g.qubit1]
      return qs.some(q => q >= numQubits)
    })
    if (outOfRange) { setError(`Qubit index out of range (circuit has ${numQubits} qubit(s))`); return }
    setError(null)
    dispatch({ type: 'APPLY_CODE', gates })
  }

  function handleChange(e: React.ChangeEvent<HTMLTextAreaElement>) {
    dispatch({ type: 'SET_CODE_TEXT', text: e.target.value })
    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => tryApply(e.target.value), 500)
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (debounceRef.current) clearTimeout(debounceRef.current)
      tryApply(e.currentTarget.value)
    }
  }

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  return (
    <div className={styles.codeInput}>
      <textarea
        value={codeText}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        rows={2}
        placeholder="H(0), CNOT(0,1), Rz(2,pi/4) — Enter or wait 500ms to apply"
        className={`${styles.codeTextarea} ${error ? styles.codeError : ''}`}
        spellCheck={false}
      />
      {error && <div className={styles.errorText}>{error}</div>}
    </div>
  )
}

// ─── Component ───────────────────────────────────────────────────────────────

type Props = { theme: 'dark' | 'light' }

export default function CircuitPage({ theme: _theme }: Props) {
  const [state, dispatch] = useReducer(circuitReducer, initialCircuitState)

  const tensorNetwork = circuitToTensorNetwork(state.gates, state.numQubits)
  const amplitudeEntries = getAmplitudeEntries(state.amplitudes, state.numQubits)

  const lastQ = state.numQubits - 1
  const lastQubitHasGate = state.gates.some(g => {
    if (g.type === 'single') return g.qubit === lastQ
    if (g.type === 'cnot')   return g.control === lastQ || g.target === lastQ
    return g.qubit0 === lastQ || g.qubit1 === lastQ
  })

  const handleAddGate = useCallback((gate: CircuitGate) => {
    dispatch({ type: 'ADD_GATE', gate })
  }, [])

  const handleAddGate_fromDrop = useCallback((qubit: number, step: number, gateType: string) => {
    const id = `d-${Date.now()}-${Math.random().toString(36).slice(2,5)}`
    if (gateType === 'CNOT') {
      const target = qubit < state.numQubits - 1 ? qubit + 1 : qubit - 1
      dispatch({ type:'ADD_GATE', gate:{ id, type:'cnot', control:qubit, target, step } })
    } else if (gateType === 'SWAP') {
      const other = qubit < state.numQubits - 1 ? qubit + 1 : qubit - 1
      dispatch({ type:'ADD_GATE', gate:{ id, type:'swap', qubit0:qubit, qubit1:other, step } })
    } else {
      dispatch({ type:'ADD_GATE', gate:{ id, type:'single', gate:gateType as GateType, qubit, step } })
    }
  }, [state.numQubits, dispatch])

  const handleCellClick = useCallback((_qubit: number, _step: number) => {
    // Builder mode: click-to-add is a future enhancement; builder form is the primary input
  }, [])

  return (
    <div className={styles.page}>
      {/* Row 1: Circuit Grid */}
      <div className={styles.circuitRow}>
        <CircuitGrid
          gates={state.gates}
          numQubits={state.numQubits}
          contractionStep={state.contractionStep}
          inputMode={state.inputMode}
          onDrop={handleAddGate_fromDrop}
          onCellClick={handleCellClick}
          onRemoveGate={id => dispatch({ type:'REMOVE_GATE', id })}
        />
      </div>

      {/* Row 2: Tensor Network + Components */}
      <div className={styles.midRow}>
        <TensorNetworkGraph
          network={tensorNetwork}
          numQubits={state.numQubits}
          contractionStep={state.contractionStep}
          maxStep={state.gates.length > 0 ? Math.max(...state.gates.map(g => g.step)) : 0}
        />
        <TensorComponents
          entries={amplitudeEntries}
          numQubits={state.numQubits}
          view={state.componentView}
          onToggleView={() => dispatch({ type:'SET_COMPONENT_VIEW',
            view: state.componentView === 'heatmap' ? 'sparse' : 'heatmap' })}
        />
      </div>

      {/* Row 3: Toolbar */}
      <div className={styles.toolbar}>
        <div className={styles.toolGroup}>
          {(['drag','builder','code'] as const).map(mode => (
            <button key={mode}
              className={`${styles.modeBtn} ${state.inputMode === mode ? styles.modeBtnActive : ''}`}
              onClick={() => dispatch({ type:'SET_INPUT_MODE', mode })}
            >{{ drag:'Drag & Drop', builder:'Builder', code:'Code' }[mode]}</button>
          ))}
        </div>
        <div className={styles.toolGroup}>
          <button className={styles.toolBtn}
            onClick={() => dispatch({ type:'ADD_QUBIT' })} disabled={state.numQubits >= 10}
          >+ Qubit</button>
          <button className={styles.toolBtn}
            onClick={() => dispatch({ type:'REMOVE_QUBIT' })}
            disabled={state.numQubits <= 1}
            title={lastQubitHasGate ? 'Remove all gates on this qubit first' : ''}
          >− Qubit</button>
          {state.numQubits > 7 && (
            <span className={styles.warning}>⚠ Large state — may be slow</span>
          )}
        </div>
        <div className={styles.toolGroup}>
          <button className={styles.toolBtn}
            onClick={() => dispatch({ type:'CONTRACT_STEP' })}
            disabled={state.contractionStep >= state.gates.length}
          >Step ▶</button>
          <button className={styles.toolBtn}
            onClick={() => dispatch({ type:'CONTRACT_ALL' })}
            disabled={state.contractionStep >= state.gates.length}
          >Contract All ⚡</button>
          <button className={styles.toolBtn} onClick={() => dispatch({ type:'RESET' })}>Reset</button>
        </div>
      </div>

      {/* Row 4: Input panel (one at a time) */}
      {state.inputMode === 'drag' && (
        <div className={styles.palette}>
          {['H','X','Y','Z','S','T','Rx','Ry','Rz','CNOT','SWAP'].map(gt => (
            <div key={gt} className={styles.chip}
              draggable
              onDragStart={e => e.dataTransfer.setData('gateType', gt)}
            >{gt}</div>
          ))}
        </div>
      )}
      {state.inputMode === 'builder' && (
        <BuilderForm numQubits={state.numQubits} currentGates={state.gates} onAdd={handleAddGate} />
      )}
      {state.inputMode === 'code' && (
        <CodeInput codeText={state.codeText} numQubits={state.numQubits} dispatch={dispatch} />
      )}

      {/* Row 5: Explanation */}
      <CircuitExplanation lastGate={state.lastGate} />
    </div>
  )
}
