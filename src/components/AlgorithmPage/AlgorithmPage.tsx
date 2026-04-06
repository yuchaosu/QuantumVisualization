// src/components/AlgorithmPage/AlgorithmPage.tsx
import { useReducer, useState, useEffect, useRef, useMemo, useCallback } from 'react'
import katex from 'katex'
import 'katex/dist/katex.min.css'
import {
  circuitReducer, initialCircuitState,
  BuilderForm, CodeInput,
} from '../CircuitPage/CircuitPage'
import type { CircuitAction } from '../CircuitPage/CircuitPage'
import CircuitGrid from '../CircuitGrid/CircuitGrid'
import TensorNetworkGraph from '../TensorNetworkGraph/TensorNetworkGraph'
import TensorComponents from '../TensorComponents/TensorComponents'
import { circuitToTensorNetwork, getAmplitudeEntries } from '../../lib/tensorNetwork'
import type { CircuitGate } from '../../lib/tensorNetwork'
import { ALGORITHMS, getAlgorithmById } from '../../lib/algorithms'
import type { AlgorithmStep } from '../../lib/algorithms'
import styles from './AlgorithmPage.module.css'

type Props = { theme: 'dark' | 'light' }

type NarTab = 'beginner' | 'math' | 'deeper'
type CanvasView = 'circuit' | 'tensor' | 'heatmap'

export default function AlgorithmPage({ theme: _theme }: Props) {
  const [algoId, setAlgoId] = useState(ALGORITHMS[0].id)
  const [canvasView, setCanvasView] = useState<CanvasView>('circuit')
  const [narTab, setNarTab] = useState<NarTab>('beginner')
  const [isPlaying, setIsPlaying] = useState(false)
  const playRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const algo = getAlgorithmById(algoId)
  const [state, dispatch] = useReducer(circuitReducer, {
    ...initialCircuitState,
    numQubits: algo.numQubits,
    gates: algo.gates,
  })

  // Load algorithm when selector changes
  function handleAlgoChange(id: string) {
    setAlgoId(id)
    setIsPlaying(false)
    const next = getAlgorithmById(id)
    dispatch({ type: 'SET_GATES', gates: next.gates, numQubits: next.numQubits })
  }

  // Play/pause auto-advance
  useEffect(() => {
    if (!isPlaying) {
      if (playRef.current) clearInterval(playRef.current)
      return
    }
    playRef.current = setInterval(() => {
      dispatch({ type: 'CONTRACT_STEP' })
    }, 800)
    return () => { if (playRef.current) clearInterval(playRef.current) }
  }, [isPlaying])

  // Stop playing when all steps done
  useEffect(() => {
    if (state.contractionStep >= state.gates.length) setIsPlaying(false)
  }, [state.contractionStep, state.gates.length])

  // Derived data
  const network = useMemo(
    () => circuitToTensorNetwork(state.gates, state.numQubits),
    [state.gates, state.numQubits]
  )
  const entries = useMemo(
    () => getAmplitudeEntries(state.amplitudes, state.numQubits),
    [state.amplitudes, state.numQubits]
  )

  // Narration: find step for current contractionStep
  const currentStep: AlgorithmStep =
    algo.steps.find(s => s.gateIndex === state.contractionStep - 1) ?? algo.steps[0]

  const mathHtml = useMemo(
    () => katex.renderToString(currentStep.math, { throwOnError: false, displayMode: true }),
    [currentStep.math]
  )

  const maxStep = state.gates.length > 0 ? Math.max(...state.gates.map(g => g.step)) : 0

  // Gate add/remove handlers (same as CircuitPage)
  const handleDrop = useCallback((qubit: number, step: number, gateType: string) => {
    const id = `u-${Date.now()}`
    if (gateType === 'CNOT') {
      dispatch({ type: 'ADD_GATE', gate: { id, type: 'cnot', control: qubit, target: Math.min(qubit + 1, state.numQubits - 1), step } })
    } else if (gateType === 'SWAP') {
      dispatch({ type: 'ADD_GATE', gate: { id, type: 'swap', qubit0: qubit, qubit1: Math.min(qubit + 1, state.numQubits - 1), step } })
    } else {
      dispatch({ type: 'ADD_GATE', gate: { id, type: 'single', gate: gateType as import('../../lib/quantum').GateType, qubit, step } })
    }
  }, [dispatch, state.numQubits])

  const handleCellClick = useCallback((_qubit: number, _step: number) => {
    // Builder mode: click-to-add is a future enhancement; builder form is the primary input
  }, [])

  const handleAddGate = useCallback((gate: CircuitGate) => {
    dispatch({ type: 'ADD_GATE', gate })
  }, [dispatch])

  return (
    <div className={styles.page}>

      {/* Algorithm selector bar */}
      <div className={styles.selectorBar}>
        <span className={styles.selectorLabel}>Algorithm</span>
        <select
          className={styles.algorithmSelect}
          value={algoId}
          onChange={e => handleAlgoChange(e.target.value)}
        >
          {ALGORITHMS.map(a => (
            <option key={a.id} value={a.id}>{a.name}</option>
          ))}
        </select>
        <span className={styles.algorithmDesc}>{algo.description}</span>
        <span className={styles.qubitBadge}>{algo.numQubits} qubits</span>
      </div>

      {/* View tabs + input mode */}
      <div className={styles.viewRow}>
        {(['circuit', 'tensor', 'heatmap'] as CanvasView[]).map(v => (
          <button key={v}
            className={`${styles.viewTab} ${canvasView === v ? styles.viewTabActive : ''}`}
            onClick={() => setCanvasView(v)}
          >
            {v === 'circuit' ? 'Circuit' : v === 'tensor' ? 'Tensor Network' : 'Heatmap'}
          </button>
        ))}
        <div className={styles.spacer} />
        {(['drag', 'builder', 'code'] as const).map(m => (
          <button key={m}
            className={`${styles.modeBtn} ${state.inputMode === m ? styles.modeBtnActive : ''}`}
            onClick={() => dispatch({ type: 'SET_INPUT_MODE', mode: m })}
          >{m}</button>
        ))}
      </div>

      {/* Canvas */}
      <div className={styles.canvas}>
        {canvasView === 'circuit' && (
          <CircuitGrid
            gates={state.gates}
            numQubits={state.numQubits}
            contractionStep={state.contractionStep}
            inputMode={state.inputMode}
            onDrop={handleDrop}
            onCellClick={handleCellClick}
            onRemoveGate={id => dispatch({ type: 'REMOVE_GATE', id })}
          />
        )}
        {canvasView === 'tensor' && (
          <TensorNetworkGraph
            network={network}
            numQubits={state.numQubits}
            contractionStep={state.contractionStep}
            maxStep={maxStep}
          />
        )}
        {canvasView === 'heatmap' && (
          <TensorComponents
            entries={entries}
            numQubits={state.numQubits}
            view={state.componentView}
            onToggleView={() => dispatch({ type: 'SET_COMPONENT_VIEW', view: state.componentView === 'heatmap' ? 'sparse' : 'heatmap' })}
          />
        )}
      </div>

      {/* Step controls */}
      <div className={styles.stepBar}>
        <button className={styles.stepBtn}
          onClick={() => { setIsPlaying(false); dispatch({ type: 'SET_GATES', gates: algo.gates, numQubits: algo.numQubits }) }}
        >⏮ Reset</button>
        <button className={styles.stepBtn}
          disabled={state.contractionStep === 0}
          onClick={() => { setIsPlaying(false); dispatch({ type: 'UNCONTRACT_STEP' }) }}
        >← Prev</button>
        <span className={styles.stepLabel}>
          Step {state.contractionStep} / {state.gates.length} — {currentStep.label}
        </span>
        <button className={styles.stepBtn}
          disabled={state.contractionStep >= state.gates.length}
          onClick={() => { setIsPlaying(false); dispatch({ type: 'CONTRACT_STEP' }) }}
        >Next →</button>
        <button className={styles.playBtn}
          onClick={() => setIsPlaying(p => !p)}
          disabled={state.contractionStep >= state.gates.length}
        >
          {isPlaying ? '⏸ Pause' : '▶ Play'}
        </button>
      </div>

      {/* Bottom: narration + input panel */}
      <div className={styles.bottomRow}>

        {/* Narration */}
        <div className={styles.narration}>
          <div className={styles.narrationHeader}>
            <span className={styles.narrationTitle}>{currentStep.label}</span>
            <div className={styles.narrationTabs}>
              {(['beginner', 'math', 'deeper'] as NarTab[]).map(t => (
                <button key={t}
                  className={`${styles.narTab} ${narTab === t ? styles.narTabActive : ''}`}
                  onClick={() => setNarTab(t)}
                >{t.charAt(0).toUpperCase() + t.slice(1)}</button>
              ))}
            </div>
          </div>
          <div className={styles.narrationBody}>
            {narTab === 'beginner' && <p>{currentStep.beginner}</p>}
            {narTab === 'math' && (
              <div dangerouslySetInnerHTML={{ __html: mathHtml }} />
            )}
            {narTab === 'deeper' && <p>{currentStep.deeper}</p>}
          </div>
        </div>

        {/* Input panel */}
        <div className={styles.inputPanel}>
          {state.inputMode === 'drag' && (
            <div style={{ display:'flex', flexWrap:'wrap', gap:8, padding:'10px 16px', alignItems:'center' }}>
              {['H','X','Y','Z','S','T','Rx','Ry','Rz','CNOT','SWAP'].map(g => (
                <span key={g}
                  style={{ padding:'4px 12px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:4, fontFamily:'var(--font-mono)', fontSize:14, cursor:'grab', color:'var(--text-primary)', userSelect:'none' }}
                  draggable
                  onDragStart={e => e.dataTransfer.setData('gateType', g)}
                >{g}</span>
              ))}
            </div>
          )}
          {state.inputMode === 'builder' && (
            <BuilderForm
              numQubits={state.numQubits}
              currentGates={state.gates}
              onAdd={handleAddGate}
            />
          )}
          {state.inputMode === 'code' && (
            <CodeInput
              codeText={state.codeText}
              numQubits={state.numQubits}
              dispatch={dispatch as React.Dispatch<CircuitAction>}
            />
          )}
        </div>

      </div>
    </div>
  )
}
