// src/components/TensorNetworkGraph/TensorNetworkGraph.tsx
import { useState } from 'react'
import type { TensorNetwork, TensorNode } from '../../lib/tensorNetwork'
import styles from './TensorNetworkGraph.module.css'

type Props = {
  network: TensorNetwork
  numQubits: number
  contractionStep: number
  maxStep: number
}

const KET_X    = 60
const STEP_W   = 120
const PAD_Y    = 40
const ROW_H    = 60

function nodeX(node: TensorNode, maxStep: number): number {
  if (node.kind === 'ket')    return KET_X
  if (node.kind === 'result') return KET_X + (maxStep + 2) * STEP_W
  return KET_X + ((node.step ?? 0) + 1) * STEP_W
}

function nodeY(node: TensorNode, numQubits: number): number {
  if (node.qubits.length === 0) return PAD_Y + (numQubits - 1) * ROW_H / 2
  const avg = node.qubits.reduce((s, q) => s + q, 0) / node.qubits.length
  return PAD_Y + avg * ROW_H
}

export default function TensorNetworkGraph({ network, numQubits, contractionStep, maxStep }: Props) {
  const [tooltipId, setTooltipId] = useState<string | null>(null)

  const effectiveMax = Math.max(maxStep, 0)
  const svgW = KET_X + (effectiveMax + 3) * STEP_W
  const svgH = PAD_Y * 2 + numQubits * ROW_H

  const nodeMap = new Map(network.nodes.map(n => [n.id, n]))

  const gateNodes = network.nodes
    .filter(n => n.kind === 'gate')
    .sort((a, b) => (a.step ?? 0) - (b.step ?? 0))
  const contractedIds = new Set(gateNodes.slice(0, contractionStep).map(n => n.id))

  return (
    <div className={styles.container}>
      <svg width={svgW} height={svgH} className={styles.svg}>
        {/* Edges */}
        {network.edges.map((edge, i) => {
          const from = nodeMap.get(edge.from)
          const to   = nodeMap.get(edge.to)
          if (!from || !to) return null
          const contracted = contractedIds.has(edge.from) || contractedIds.has(edge.to)
          return (
            <line key={i}
              x1={nodeX(from, effectiveMax)} y1={nodeY(from, numQubits)}
              x2={nodeX(to,   effectiveMax)} y2={nodeY(to,   numQubits)}
              stroke={contracted ? 'var(--accent-green)' : 'var(--text-secondary)'}
              strokeWidth={contracted ? 2 : 1.5}
              strokeOpacity={contracted ? 0.5 : 0.8}
            />
          )
        })}

        {/* Nodes */}
        {network.nodes.map(node => {
          const x = nodeX(node, effectiveMax)
          const y = nodeY(node, numQubits)
          const contracted = contractedIds.has(node.id)
          const isTooltip  = tooltipId === node.id

          if (node.kind === 'ket') return (
            <g key={node.id}>
              <circle cx={x} cy={y} r={16}
                fill="var(--bg-surface)" stroke="var(--accent-blue)" strokeWidth={2} />
              <text x={x} y={y+4} textAnchor="middle" fill="var(--accent-blue)"
                fontSize={11} fontFamily="var(--font-mono)">|0⟩</text>
            </g>
          )

          if (node.kind === 'result') return (
            <g key={node.id}>
              <circle cx={x} cy={y} r={18}
                fill="var(--bg-surface)" stroke="var(--accent-green)" strokeWidth={2} />
              <text x={x} y={y+4} textAnchor="middle" fill="var(--accent-green)"
                fontSize={11} fontFamily="var(--font-mono)">|ψ⟩</text>
            </g>
          )

          // Gate node
          const W = 46, H = 28
          return (
            <g key={node.id}
              opacity={contracted ? 0.35 : 1}
              onMouseEnter={() => setTooltipId(node.id)}
              onMouseLeave={() => setTooltipId(null)}
              style={{ cursor: 'default' }}
            >
              <rect x={x-W/2} y={y-H/2} width={W} height={H} rx={4}
                fill="var(--bg-surface)"
                stroke={contracted ? 'var(--accent-green)' : (isTooltip ? 'var(--accent-blue)' : 'var(--border)')}
                strokeWidth={isTooltip ? 2 : 1.5}
              />
              <text x={x} y={y+4} textAnchor="middle"
                fill={contracted ? 'var(--accent-green)' : 'var(--text-primary)'}
                fontSize={11} fontFamily="var(--font-mono)">
                {node.label}
              </text>
            </g>
          )
        })}

        {/* Hover tooltip */}
        {tooltipId && (() => {
          const node = nodeMap.get(tooltipId)
          if (!node || node.kind !== 'gate') return null
          const x = nodeX(node, effectiveMax)
          const y = nodeY(node, numQubits)
          const text = `${node.label}: rank-${node.rank}, [${node.shape.join(',')}]`
          const tw = text.length * 6.5 + 16
          return (
            <g>
              <rect x={x + 8} y={y - 22} width={tw} height={26} rx={4}
                fill="var(--bg-elevated)" stroke="var(--border)" />
              <text x={x + 16} y={y - 5} fill="var(--text-secondary)" fontSize={11}
                fontFamily="var(--font-mono)">{text}</text>
            </g>
          )
        })()}
      </svg>
    </div>
  )
}
