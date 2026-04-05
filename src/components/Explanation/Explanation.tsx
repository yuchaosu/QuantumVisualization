// src/components/Explanation/Explanation.tsx
import { useState, useMemo } from 'react'
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

  const matrixHtml = useMemo(
    () => katex.renderToString(entry.matrix, { throwOnError: false, displayMode: true }),
    [entry.matrix]
  )

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
